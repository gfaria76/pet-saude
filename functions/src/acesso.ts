import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import {
  LogAcessoSchema,
  claimsAcessoSchema,
  identificadorAcessoSchema,
  identidadeInstitucionalValida,
  vinculoSchema,
  vinculoVigente
} from '../../shared/domain/acesso.js'

export function exigirIdentidade(req: CallableRequest) {
  const auth = req.auth
  if (
    !auth ||
    !identidadeInstitucionalValida(auth.token.email, auth.token.email_verified, auth.token.firebase?.sign_in_provider)
  ) {
    throw new HttpsError('unauthenticated', 'Entre com a conta institucional verificada.')
  }
  return auth
}
export async function exigirAcesso(req: CallableRequest) {
  const auth = exigirIdentidade(req)
  const claims = claimsAcessoSchema.safeParse(auth.token)
  if (!claims.success) throw new HttpsError('permission-denied', 'Selecione um vínculo autorizado.')
  const doc = await getFirestore().doc(`tenants/${claims.data.tenantId}/vinculos/${auth.uid}`).get()
  const vinculo = vinculoSchema.safeParse(doc.data())
  if (!vinculo.success || !vinculoVigente(claims.data, vinculo.data, auth.uid)) {
    throw new HttpsError('permission-denied', 'Vínculo revogado ou alterado. Entre novamente.')
  }
  return { uid: auth.uid, ...claims.data }
}
export const listarMeusVinculos = onCall({ region: 'southamerica-east1', maxInstances: 10 }, async req => {
  const auth = exigirIdentidade(req)
  const resultado = await getFirestore()
    .collectionGroup('vinculos')
    .where('uid', '==', auth.uid)
    .where('status', '==', 'ATIVO')
    .get()
  const vinculos = resultado.docs.flatMap(doc => {
    const v = vinculoSchema.safeParse(doc.data())
    return v.success && doc.ref.path === `tenants/${v.data.tenantId}/vinculos/${auth.uid}` ? [v.data] : []
  })
  return { vinculos }
})
export const selecionarTenant = onCall({ region: 'southamerica-east1', maxInstances: 10 }, async req => {
  const auth = exigirIdentidade(req)
  const tenant = identificadorAcessoSchema.safeParse(req.data?.tenantId)
  if (!tenant.success) throw new HttpsError('invalid-argument', 'Município inválido.')
  const doc = await getFirestore().doc(`tenants/${tenant.data}/vinculos/${auth.uid}`).get()
  const v = vinculoSchema.safeParse(doc.data())
  if (!v.success || v.data.status !== 'ATIVO' || v.data.uid !== auth.uid || v.data.tenantId !== tenant.data) {
    throw new HttpsError('permission-denied', 'Vínculo indisponível.')
  }
  const claims = claimsAcessoSchema.parse(v.data)
  if (Buffer.byteLength(JSON.stringify(claims)) > 900) {
    throw new HttpsError('failed-precondition', 'Escopo de acesso excede o limite de permissões.')
  }
  await getAuth().setCustomUserClaims(auth.uid, claims)
  return { claims }
})
export const gerirVinculo = onCall({ region: 'southamerica-east1', maxInstances: 10 }, async req => {
  const operador = await exigirAcesso(req)
  const parsed = vinculoSchema.safeParse(req.data?.vinculo)
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Vínculo inválido.')
  const novo = parsed.data
  if (
    operador.perfil !== 'ADMIN' ||
    novo.tenantId !== operador.tenantId ||
    novo.uid === operador.uid ||
    novo.perfil === 'ADMIN'
  ) {
    throw new HttpsError('permission-denied', 'Operação não autorizada.')
  }
  const conta = await getAuth().getUser(novo.uid)
  if (
    conta.disabled ||
    !identidadeInstitucionalValida(
      conta.email,
      conta.emailVerified,
      conta.providerData.some(p => p.providerId === 'google.com') ? 'google.com' : ''
    )
  ) {
    throw new HttpsError('failed-precondition', 'Conta institucional indisponível.')
  }
  const db = getFirestore()
  const ref = db.doc(`tenants/${novo.tenantId}/vinculos/${novo.uid}`)
  await db.runTransaction(async tx => {
    // Revalida também dentro da transação para impedir administração após revogação concorrente.
    const [anterior, administrador] = await Promise.all([
      tx.get(ref),
      tx.get(db.doc(`tenants/${operador.tenantId}/vinculos/${operador.uid}`))
    ])
    const atualAdmin = vinculoSchema.safeParse(administrador.data())
    if (!atualAdmin.success || !vinculoVigente(operador, atualAdmin.data, operador.uid)) {
      throw new HttpsError('permission-denied', 'Vínculo administrativo alterado.')
    }
    if (anterior.data()?.perfil === 'ADMIN') {
      throw new HttpsError('permission-denied', 'Administradores exigem governança externa.')
    }
    const versaoAnterior = anterior.exists ? vinculoSchema.parse(anterior.data()).versaoAcesso : 0
    if (novo.versaoAcesso !== versaoAnterior + 1) {
      throw new HttpsError('aborted', 'O vínculo mudou. Recarregue antes de continuar.')
    }
    tx.set(ref, novo)
    tx.create(db.collection(`tenants/${operador.tenantId}/logs_auditoria`).doc(), {
      ...LogAcessoSchema.parse({
        municipioId: operador.municipioId,
        usuarioId: operador.uid,
        perfil: operador.perfil,
        acao: novo.status === 'ATIVO' ? 'APROVAR_VINCULO' : 'REVOGAR_VINCULO',
        recursoTipo: 'vinculo',
        recursoId: novo.uid,
        dataHora: new Date().toISOString()
      }),
      registradoEm: FieldValue.serverTimestamp()
    })
  })
  // As regras consultam a versão vigente: tokens antigos já estão bloqueados.
  return { versaoAcesso: novo.versaoAcesso }
})

export const consultarVinculo = onCall({ region: 'southamerica-east1', maxInstances: 10 }, async req => {
  const operador = await exigirAcesso(req)
  const uid = identificadorAcessoSchema.safeParse(req.data?.uid)
  if (operador.perfil !== 'ADMIN') throw new HttpsError('permission-denied', 'Acesso administrativo necessário.')
  if (!uid.success) throw new HttpsError('invalid-argument', 'Identificador inválido.')
  const doc = await getFirestore().doc(`tenants/${operador.tenantId}/vinculos/${uid.data}`).get()
  return { vinculo: doc.exists ? vinculoSchema.parse(doc.data()) : null }
})
