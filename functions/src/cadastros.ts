import { z } from 'zod'
import { createHash } from 'node:crypto'
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore'
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { claimsAcessoSchema, identidadeInstitucionalValida, vinculoSchema, vinculoVigente,
  type ClaimsAcesso } from '../../shared/domain/acesso'
import { OperacaoCadastroSchema, RegistroCadastroSchema, type ReciboCadastro } from '../../shared/domain/cadastro'
import { DomicilioSchema, FamiliaVersionadaSchema, IndividuoSchema, LogAuditoriaSchema, MicroareaSchema } from '../../shared/domain/schemas'
import { FaixaRisco } from '../../shared/domain/risk-engine/types'
const hash = (s: string) => createHash('sha256').update(s).digest('hex')
const limpar = <T>(v: T): T => JSON.parse(JSON.stringify(v))
function autorizar(c: ClaimsAcesso, t: { municipioId: string; equipeId: string; microareaId: string }) {
  if (t.municipioId !== c.tenantId || (c.perfil !== 'COORDENADOR_APS' &&
    (c.equipeId !== t.equipeId || (c.perfil === 'ACS' && !c.microareaIds.includes(t.microareaId))))) {
    throw new HttpsError('permission-denied', 'Território indisponível.')
  }
}
export async function processarCadastro(request: Pick<CallableRequest, 'auth' | 'data'>, db: Firestore,
  agora = new Date().toISOString()): Promise<ReciboCadastro> {
  const parsed = OperacaoCadastroSchema.safeParse(request.data)
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Cadastro inválido ou incompleto.')
  const op = parsed.data
  const auth = request.auth
  if (!auth || !identidadeInstitucionalValida(auth.token.email, auth.token.email_verified,
    auth.token.firebase?.sign_in_provider)) throw new HttpsError('unauthenticated', 'Identidade institucional exigida.')
  const claims = claimsAcessoSchema.safeParse(auth.token)
  if (!claims.success || claims.data.tenantId !== op.tenantId || claims.data.perfil === 'ADMIN') {
    throw new HttpsError('permission-denied', 'Escopo de saúde exigido.')
  }
  const c = claims.data
  if (op.tipo === 'TRANSFERIR' && c.perfil !== 'COORDENADOR_APS') {
    throw new HttpsError('permission-denied',
      'Transferência exige coordenação municipal.')
  }
  if (op.tipo === 'CRIAR' && op.responsavel.dataNascimento > agora.slice(0, 10)) {
    throw new HttpsError('invalid-argument',
      'Nascimento futuro.')
  }
  const base = db.doc(`tenants/${op.tenantId}`)
  const chave = hash(`cadastro:${auth.uid}:${op.tenantId}:${op.operacaoId}`)
  const conteudoHash = hash(JSON.stringify(op))
  const familiaId = op.tipo === 'CRIAR' ? hash(`${chave}:familia`) : op.familiaId
  return db.runTransaction(async tx => {
    const v = vinculoSchema.safeParse((await tx.get(base.collection('vinculos').doc(auth.uid))).data())
    if (!v.success || !vinculoVigente(c, v.data, auth.uid)) throw new HttpsError('permission-denied', 'Vínculo indisponível.')
    const familiaRef = base.collection('familias').doc(familiaId)
    const snap = await tx.get(familiaRef)
    const validacaoFamilia = snap.exists ? FamiliaVersionadaSchema.safeParse(snap.data()) : undefined
    if (validacaoFamilia && (!validacaoFamilia.success || validacaoFamilia.data.id !== familiaId)) {
      throw new HttpsError('failed-precondition', 'Cadastro armazenado inconsistente.')
    }
    const familia = validacaoFamilia?.success ? validacaoFamilia.data : undefined
    if (op.tipo !== 'CRIAR') {
      if (!familia) throw new HttpsError('not-found', 'Família indisponível.')
      autorizar(c, familia)
    } else {
      autorizar(c, { municipioId: op.tenantId, ...op })
      if (familia) autorizar(c, familia)
    }
    const registroRef = base.collection('operacoes_cadastro').doc(chave)
    const registro = await tx.get(registroRef)
    if (registro.exists) {
      const validacaoRegistro = RegistroCadastroSchema.safeParse({ uid: registro.get('uid'),
        municipioId: registro.get('municipioId'), conteudoHash: registro.get('conteudoHash'), recibo: registro.get('recibo') })
      if (!validacaoRegistro.success) throw new HttpsError('failed-precondition', 'Recibo armazenado inconsistente.')
      const existente = validacaoRegistro.data
      if (existente.conteudoHash !== conteudoHash) {
        throw new HttpsError('already-exists',
          'Identificador reutilizado com conteúdo diferente.')
      }
      return existente.recibo
    }
    const versaoCadastro = familia?.versaoCadastro ?? 0
    const conflito = op.tipo !== 'CRIAR' && op.versaoCadastroBase !== versaoCadastro
    const recibo: ReciboCadastro = { operacaoId: op.operacaoId, familiaId,
      versaoCadastro: conflito ? versaoCadastro : op.tipo === 'CRIAR' ? 0 : versaoCadastro + 1,
      status: conflito ? 'CONFLITO' : 'CONFIRMADA', registradoEm: agora }
    const auditar = (
      acao: z.infer<typeof LogAuditoriaSchema>['acao'],
      recursoTipo: 'FAMILIA' | 'DOMICILIO' | 'INDIVIDUO', recursoId: string
    ) => {
      tx.create(base.collection('logs_auditoria').doc(hash(`${chave}:${recursoTipo}:${recursoId}`)), {
        ...LogAuditoriaSchema.parse({ usuarioId: auth.uid, perfil: c.perfil, municipioId: op.tenantId, acao, recursoTipo,
          recursoId: hash(recursoId), dataHora: agora }), registradoEm: FieldValue.serverTimestamp()
      })
    }
    if (!conflito && (op.tipo === 'CRIAR' || op.tipo === 'TRANSFERIR')) {
      const destino = MicroareaSchema.safeParse((await tx.get(base.collection('microareas').doc(op.microareaId))).data())
      if (!destino.success || destino.data.id !== op.microareaId || destino.data.municipioId !== op.tenantId ||
        destino.data.equipeId !== op.equipeId) throw new HttpsError('failed-precondition', 'Microárea de destino inválida.')
    }
    if (!conflito && op.tipo === 'CRIAR') {
      if (familia) throw new HttpsError('already-exists', 'Cadastro já existe.')
      const territorio = { municipioId: op.tenantId, equipeId: op.equipeId, microareaId: op.microareaId }
      const domicilioId = hash(`${chave}:domicilio`)
      const responsavelId = hash(`${chave}:responsavel`)
      tx.create(base.collection('domicilios').doc(domicilioId), limpar(DomicilioSchema.parse({ ...op.domicilio, ...territorio,
        id: domicilioId })))
      tx.create(base.collection('individuos').doc(responsavelId), limpar(IndividuoSchema.parse({ ...op.responsavel,
        ...territorio, id: responsavelId, familiaId })))
      tx.create(familiaRef, limpar(FamiliaVersionadaSchema.parse({ ...territorio, id: familiaId, domicilioId, responsavelId,
        responsavelNome: op.responsavel.nome, prontuarioFamiliar: op.prontuarioFamiliar, contato: op.contato, status: 'ATIVA',
        quantidadeMembros: 1, ultimaClassificacaoRisco: FaixaRisco.SEM_RISCO_R0, ultimaPontuacaoRisco: 0, versaoCadastro: 0 })))
      auditar('CRIAR_FAMILIA', 'FAMILIA', familiaId)
      auditar('CRIAR_DOMICILIO', 'DOMICILIO', domicilioId)
      auditar('CRIAR_INDIVIDUO', 'INDIVIDUO', responsavelId)
    } else if (!conflito && op.tipo === 'ATUALIZAR') {
      tx.update(familiaRef, { prontuarioFamiliar: op.prontuarioFamiliar, contato: op.contato ?? FieldValue.delete(),
        status: op.status, versaoCadastro: recibo.versaoCadastro })
      auditar(op.status === 'ATIVA' ? 'ATUALIZAR_FAMILIA' : 'INATIVAR_FAMILIA', 'FAMILIA', familiaId)
    } else if (!conflito && op.tipo === 'TRANSFERIR' && familia) {
      if (familia.status !== 'ATIVA') throw new HttpsError('failed-precondition', 'Família inativa.')
      const domicilioRef = base.collection('domicilios').doc(familia.domicilioId)
      const domicilio = DomicilioSchema.safeParse((await tx.get(domicilioRef)).data())
      const compartilhadas = await tx.get(base.collection('familias').where('domicilioId', '==', familia.domicilioId).limit(2))
      const membros = await tx.get(base.collection('individuos').where('familiaId', '==', familiaId).limit(51))
      const mesmoTerritorio = (t: {municipioId: string; equipeId: string; microareaId: string}) => {
        return t.municipioId === familia.municipioId &&
          t.equipeId === familia.equipeId && t.microareaId === familia.microareaId
      }
      if (!domicilio.success || domicilio.data.id !== familia.domicilioId || !mesmoTerritorio(domicilio.data) ||
        compartilhadas.size !== 1 || membros.size !== familia.quantidadeMembros || membros.size > 50 ||
        !membros.docs.some(m => m.id === familia.responsavelId) || membros.docs.some(m => {
        const p = IndividuoSchema.safeParse(m.data())
        return !p.success || p.data.id !== m.id || !mesmoTerritorio(p.data)
      })) throw new HttpsError('failed-precondition', 'Cadastro inconsistente ou domicílio compartilhado; revisão necessária.')
      const territorio = { equipeId: op.equipeId, microareaId: op.microareaId }
      tx.update(familiaRef, { ...territorio, versaoCadastro: recibo.versaoCadastro })
      tx.update(domicilioRef, territorio)
      auditar('ATUALIZAR_FAMILIA', 'FAMILIA', familiaId)
      auditar('ATUALIZAR_DOMICILIO', 'DOMICILIO', familia.domicilioId)
      for (const membro of membros.docs) {
        tx.update(membro.ref, territorio)
        auditar('ATUALIZAR_INDIVIDUO', 'INDIVIDUO', membro.id)
      }
    }
    tx.create(registroRef, { ...RegistroCadastroSchema.parse({ uid: auth.uid, municipioId: op.tenantId, conteudoHash, recibo }),
      registradoEm: FieldValue.serverTimestamp() })
    return recibo
  })
}
export const registrarCadastro = onCall({ region: 'southamerica-east1', maxInstances: 10 }, async request => {
  try {
    return await processarCadastro(request, getFirestore())
  } catch (error) {
    if (error instanceof HttpsError) throw error
    if (error instanceof z.ZodError) throw new HttpsError('failed-precondition', 'Cadastro armazenado inconsistente.')
    throw new HttpsError('internal', 'Não foi possível concluir o cadastro.')
  }
})
