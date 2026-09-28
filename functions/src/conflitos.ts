import { createHash } from 'node:crypto'
import { getFirestore, FieldPath, type Firestore } from 'firebase-admin/firestore'
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { claimsAcessoSchema, identidadeInstitucionalValida, vinculoSchema, vinculoVigente } from '../../shared/domain/acesso'
import { ConsultaConflitosSchema, ResultadoConsultaConflitosSchema } from '../../shared/domain/conflitos'
import { RegistroOperacaoSchema, AvaliacaoCanonicaSchema } from '../../shared/domain/sincronizacao'
import { FamiliaVersionadaSchema } from '../../shared/domain/schemas'

export async function processarConsultaConflitos(request: Pick<CallableRequest, 'auth' | 'data'>, db: Firestore) {
  const entrada = ConsultaConflitosSchema.safeParse(request.data)
  if (!entrada.success) throw new HttpsError('invalid-argument', 'Consulta inválida.')
  const { tenantId, operacaoId, cursor } = entrada.data
  const auth = request.auth
  if (!auth || !identidadeInstitucionalValida(auth.token.email, auth.token.email_verified, auth.token.firebase?.sign_in_provider)) {
    throw new HttpsError('unauthenticated', 'Identidade institucional exigida.')
  }
  const claims = claimsAcessoSchema.safeParse(auth.token)
  if (!claims.success || claims.data.tenantId !== tenantId || claims.data.perfil === 'ADMIN') {
    throw new HttpsError('permission-denied', 'Escopo de saúde exigido.')
  }
  const escopo = claims.data
  const base = db.doc(`tenants/${tenantId}`)
  return db.runTransaction(async tx => {
    const vinculo = vinculoSchema.safeParse((await tx.get(base.collection('vinculos').doc(auth.uid))).data())
    if (!vinculo.success || !vinculoVigente(escopo, vinculo.data, auth.uid)) {
      throw new HttpsError('permission-denied', 'Vínculo ativo exigido.')
    }
    const autorizado = (d: { municipioId: string; equipeId: string; microareaId: string }) => d.municipioId === tenantId &&
      (escopo.perfil === 'COORDENADOR_APS' || (d.equipeId === escopo.equipeId && (escopo.perfil !== 'ACS' ||
      escopo.microareaIds.includes(d.microareaId))))
    let query = base.collection('operacoes')
      .where('uid', '==', auth.uid).where('recibo.status', '==', 'CONFLITO')
      .orderBy(FieldPath.documentId()).limit(20)
    if (cursor) query = query.startAfter(cursor)
    const docs = operacaoId ?
      [await tx.get(base.collection('operacoes').doc(createHash('sha256').update(`${auth.uid}:${tenantId}:${operacaoId}`).digest('hex')))] :
      (await tx.get(query)).docs
    const conflitos = []
    let detalhe
    for (const doc of docs) {
      const registro = RegistroOperacaoSchema.safeParse(doc.data())
      if (!registro.success || registro.data.uid !== auth.uid || registro.data.municipioId !== tenantId ||
        registro.data.recibo.status !== 'CONFLITO' || !registro.data.operacao) continue
      const op = registro.data.operacao
      const chaveEsperada = createHash('sha256').update(`${auth.uid}:${tenantId}:${op.operacaoId}`).digest('hex')
      if (op.tenantId !== tenantId || op.operacaoId !== registro.data.recibo.operacaoId || doc.id !== chaveEsperada ||
        (operacaoId && op.operacaoId !== operacaoId)) continue
      const familia = FamiliaVersionadaSchema.safeParse((await tx.get(base.collection('familias').doc(op.familiaId))).data())
      if (!familia.success || familia.data.id !== op.familiaId || !autorizado(familia.data)) continue
      conflitos.push({ operacaoId: op.operacaoId, familiaId: op.familiaId, registradoEm: registro.data.recibo.registradoEm,
        motivo: registro.data.recibo.motivo })
      if (operacaoId) {
        let avaliacaoAtual = null
        if (familia.data.ultimaAvaliacaoId) {
          const avaliacaoSnap = await tx.get(base.collection('avaliacoes_risco').doc(familia.data.ultimaAvaliacaoId))
          const a = AvaliacaoCanonicaSchema.safeParse(avaliacaoSnap.data())
          if (!a.success || (a.data.id !== undefined && a.data.id !== familia.data.ultimaAvaliacaoId) ||
            a.data.familiaId !== op.familiaId || !autorizado(a.data)) {
            throw new HttpsError('failed-precondition', 'Avaliação atual indisponível para revisão.')
          }
          avaliacaoAtual = { id: familia.data.ultimaAvaliacaoId, dataAvaliacao: a.data.dataAvaliacao,
            versaoEscala: a.data.versaoEscala, respostas: a.data.respostas }
        }
        detalhe = { operacao: op, recibo: registro.data.recibo, familia: { id: op.familiaId,
          versaoCadastro: familia.data.versaoCadastro, ultimaAvaliacaoId: familia.data.ultimaAvaliacaoId ?? null,
          status: familia.data.status }, avaliacaoAtual }
      }
    }
    if (operacaoId && !detalhe) throw new HttpsError('not-found', 'Conflito indisponível.')
    return ResultadoConsultaConflitosSchema.parse({ conflitos, ...(detalhe ? { detalhe } : {}), proximoCursor: !operacaoId &&
      docs.length === 20 ? docs[docs.length - 1]!.id : null })
  })
}
export const consultarConflitos = onCall({ region: 'southamerica-east1', maxInstances: 10 }, request =>
  processarConsultaConflitos(request, getFirestore())
)
