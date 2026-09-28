/** Somente dados fictícios e hosts locais. Nunca inicializa credenciais de produção. */
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { seedFamilias } from './seed-familias.mjs'
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-pet-saude'
for (const variable of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
  if (!/^(localhost|127\.0\.0\.1):\d+$/.test(process.env[variable] ?? '')) throw new Error(`${variable} deve apontar para emulador local.`)
}
if (!projectId.startsWith('demo-')) throw new Error('Somente projetos demo-* são permitidos.')
initializeApp({ projectId })
const auth = getAuth()
const db = getFirestore()
for (const [uid, perfil] of [['admin-ficticio', 'ADMIN'], ['acs-ficticio', 'ACS'], ['coordenador-ficticio', 'COORDENADOR_APS']]) {
  const email = `${uid}@ufms.br`
  try { await auth.createUser({ uid, email, emailVerified: true, displayName: 'Profissional Fictício', providerToLink: { providerId: 'google.com', uid: `google-${uid}`, email } }) }
  catch (error) { if (error.code !== 'auth/uid-already-exists') throw error }
  const claims = { tenantId: 'municipio-teste', municipioId: 'municipio-teste', perfil, ...(perfil === 'ACS' ? { equipeId: 'equipe-teste' } : {}), microareaIds: perfil === 'ACS' ? ['microarea-teste'] : [], versaoAcesso: 1 }
  await auth.setCustomUserClaims(uid, claims)
  await db.doc(`tenants/municipio-teste/vinculos/${uid}`).set({ uid, ...claims, status: 'ATIVO' })
}
await db.doc('tenants/municipio-teste').set({ municipioId: 'municipio-teste', nome: 'Município Fictício de Teste' })
for (const [id, equipeId] of [['microarea-teste', 'equipe-teste'], ['microarea-destino', 'equipe-destino']]) {
  await db.doc(`tenants/municipio-teste/microareas/${id}`).set({ id, numero: id === 'microarea-teste' ? '1' : '2', equipeId, municipioId: 'municipio-teste' })
}
await seedFamilias(db, 'municipio-teste', 'equipe-teste', 'microarea-teste')
console.log('Contas e vínculos fictícios criados apenas nos emuladores locais.')
