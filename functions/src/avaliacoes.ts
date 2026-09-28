import {
  claimsAcessoSchema,
  identidadeInstitucionalValida,
  vinculoSchema,
  vinculoVigente
} from '../../shared/domain/acesso'
import { createHash } from 'node:crypto'
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore'
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import {
  OperacaoAvaliacaoSchema, RegistroOperacaoSchema, AvaliacaoCanonicaSchema, type ReciboOperacao
} from '../../shared/domain/sincronizacao'
import { calcularEstratificacaoRisco } from '../../shared/domain/risk-engine/calculadora'
import { CONFIGURACAO_COELHO_SAVASSI_V1 } from '../../shared/domain/risk-engine/constants'
import { PerfilProfissional } from '../../shared/domain/risk-engine/types'
import {
  AvaliacaoRiscoSchema,
  FamiliaVersionadaSchema,
  LogAuditoriaSchema,
  montarDocumentoAvaliacao
} from '../../shared/domain/schemas'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const limpar = <T>(value: T): T => JSON.parse(JSON.stringify(value))

/** Servidor é a única autoridade para pontuação, autoria, resumo e auditoria. */
export async function processarAvaliacao(
  request: Pick<CallableRequest, 'auth' | 'data'>,
  db: Firestore,
  agora = new Date().toISOString()
): Promise<ReciboOperacao> {
  const parsed = OperacaoAvaliacaoSchema.safeParse(request.data)
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Operação inválida ou respostas incompletas.')
  const op = parsed.data
  const auth = request.auth
  if (
    !auth ||
    !identidadeInstitucionalValida(auth.token.email, auth.token.email_verified, auth.token.firebase?.sign_in_provider)
  ) {
    throw new HttpsError('unauthenticated', 'Identidade institucional exigida.')
  }
  if (op.versaoEscala !== CONFIGURACAO_COELHO_SAVASSI_V1.versao) {
    throw new HttpsError('failed-precondition', 'Versão de escala indisponível.')
  }
  if (Date.parse(op.coletadoEm) > Date.parse(agora)) throw new HttpsError('invalid-argument', 'Data de coleta futura.')
  const claims = claimsAcessoSchema.safeParse(auth.token)
  if (!claims.success || claims.data.tenantId !== op.tenantId) {
    throw new HttpsError('permission-denied', 'Escopo inválido.')
  }
  const base = db.doc(`tenants/${op.tenantId}`)
  const chave = hash(`${auth.uid}:${op.tenantId}:${op.operacaoId}`)
  const conteudoHash = hash(
    JSON.stringify({ ...op, indicadores: [...op.indicadores].sort((a, b) => a.codigo.localeCompare(b.codigo)) })
  )
  return db.runTransaction(async tx => {
    // Vínculo lido na transação: revogação concorrente provoca nova validação.
    const vinculoSnap = await tx.get(base.collection('vinculos').doc(auth.uid))
    const validacaoVinculo = vinculoSchema.safeParse(vinculoSnap.data())
    const perfil = claims.data.perfil
    if (
      !validacaoVinculo.success ||
      !vinculoVigente(claims.data, validacaoVinculo.data, auth.uid) ||
      perfil === PerfilProfissional.ADMIN
    ) {
      throw new HttpsError('permission-denied', 'Vínculo ativo e escopo de saúde exigidos.')
    }
    const vinculo = validacaoVinculo.data
    const familiaRef = base.collection('familias').doc(op.familiaId)
    const familiaSnap = await tx.get(familiaRef)
    if (!familiaSnap.exists) throw new HttpsError('not-found', 'Família indisponível.')
    const familia = FamiliaVersionadaSchema.parse({ ...familiaSnap.data(), id: familiaSnap.id })
    if (
      familia.municipioId !== op.tenantId ||
      (perfil !== PerfilProfissional.COORDENADOR_APS &&
        (familia.equipeId !== vinculo.equipeId || familia.equipeId !== auth.token.equipeId)) ||
      (perfil === PerfilProfissional.ACS &&
        (!Array.isArray(vinculo.microareaIds) ||
          !vinculo.microareaIds.includes(familia.microareaId) ||
          !Array.isArray(auth.token.microareaIds) ||
          !auth.token.microareaIds.includes(familia.microareaId)))
    ) {
      throw new HttpsError('permission-denied', 'Território indisponível.')
    }
    const reciboRef = base.collection('operacoes').doc(chave)
    const existente = await tx.get(reciboRef)
    if (existente.exists) {
      const dados = RegistroOperacaoSchema.parse(existente.data())
      if (dados.conteudoHash !== conteudoHash) {
        throw new HttpsError('already-exists', 'Identificador reutilizado com conteúdo diferente.')
      }
      return dados.recibo
    }
    if (familia.status !== 'ATIVA') throw new HttpsError('failed-precondition', 'Família inativa.')
    const motivo =
      familia.versaoCadastro !== op.versaoCadastroBase ?
        'CADASTRO_ALTERADO' :
        (familia.ultimaAvaliacaoId ?? null) !== op.avaliacaoAnteriorId ?
          'AVALIACAO_ALTERADA' :
          undefined
    if (motivo) {
      const recibo: ReciboOperacao = { operacaoId: op.operacaoId, status: 'CONFLITO', registradoEm: agora, motivo }
      tx.create(reciboRef, {
        ...RegistroOperacaoSchema.parse({ uid: auth.uid, municipioId: op.tenantId, conteudoHash, recibo, operacao: op }),
        registradoEm: FieldValue.serverTimestamp()
      })
      return recibo
    }
    const domicilio = (await tx.get(base.collection('domicilios').doc(familia.domicilioId))).data()
    if (
      !domicilio ||
      domicilio.municipioId !== op.tenantId ||
      domicilio.equipeId !== familia.equipeId ||
      domicilio.microareaId !== familia.microareaId
    ) {
      throw new HttpsError('failed-precondition', 'Domicílio territorial inválido.')
    }
    const individuoIds = [
      ...new Set([familia.responsavelId, ...op.indicadores.flatMap(i => (i.individuoId ? [i.individuoId] : []))])
    ]
    for (const individuoId of individuoIds) {
      const individuo = (await tx.get(base.collection('individuos').doc(individuoId))).data()
      if (
        !individuo ||
        individuo.familiaId !== familia.id ||
        individuo.municipioId !== op.tenantId ||
        individuo.equipeId !== familia.equipeId ||
        individuo.microareaId !== familia.microareaId
      ) {
        throw new HttpsError('failed-precondition', 'Membro não pertence à família e território.')
      }
    }
    let anterior
    if (op.avaliacaoAnteriorId) {
      const snap = await tx.get(base.collection('avaliacoes_risco').doc(op.avaliacaoAnteriorId))
      const a = AvaliacaoRiscoSchema.parse(snap.data())
      if (a.familiaId !== familia.id || a.municipioId !== op.tenantId) {
        throw new HttpsError('failed-precondition', 'Referência anterior inválida.')
      }
      anterior = {
        id: op.avaliacaoAnteriorId,
        data: a.dataAvaliacao,
        pontuacao: a.pontuacaoTotal,
        classificacao: a.classificacao,
        fatores: a.fatoresDeterminantes
      }
    }
    const resultado = calcularEstratificacaoRisco(
      { familiaId: familia.id, indicadores: op.indicadores, avaliacaoAnterior: anterior },
      { avaliadorId: auth.uid, avaliadorPerfil: perfil, dataAvaliacao: op.coletadoEm }
    )
    const avaliacao = montarDocumentoAvaliacao(resultado, {
      familiaId: familia.id,
      avaliadorNome: typeof auth.token.name === 'string' ? auth.token.name.slice(0, 120) : 'Profissional institucional',
      territorio: familia
    })
    const recibo: ReciboOperacao = {
      operacaoId: op.operacaoId,
      status: 'CONFIRMADA',
      registradoEm: agora,
      avaliacaoId: chave
    }
    tx.create(base.collection('avaliacoes_risco').doc(chave), {
      ...limpar(AvaliacaoCanonicaSchema.parse({ ...avaliacao, id: chave, respostas: op.indicadores, operacaoId: op.operacaoId })),
      registradoEm: FieldValue.serverTimestamp()
    })
    tx.update(familiaRef, {
      ultimaAvaliacaoId: chave,
      ultimaClassificacaoRisco: resultado.classificacao,
      ultimaPontuacaoRisco: resultado.pontuacaoTotal,
      dataUltimaAvaliacao: op.coletadoEm
    })
    tx.create(reciboRef, {
      ...RegistroOperacaoSchema.parse({ uid: auth.uid, municipioId: op.tenantId, conteudoHash, recibo }),
      registradoEm: FieldValue.serverTimestamp()
    })
    tx.create(base.collection('logs_auditoria').doc(chave), {
      ...LogAuditoriaSchema.parse({
        usuarioId: auth.uid,
        perfil,
        municipioId: op.tenantId,
        acao: 'CRIAR_AVALIACAO_RISCO',
        recursoTipo: 'AVALIACAO_RISCO',
        recursoId: chave,
        dataHora: agora
      }),
      registradoEm: FieldValue.serverTimestamp()
    })
    return recibo
  })
}

export const registrarAvaliacao = onCall({ region: 'southamerica-east1', maxInstances: 10 }, request =>
  processarAvaliacao(request, getFirestore())
)
