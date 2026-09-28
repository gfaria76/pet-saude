/** Smoke real Auth + Functions; exige seed-emulator previamente executado. */
import assert from 'node:assert/strict'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
const project = process.env.GCLOUD_PROJECT ?? 'demo-pet-saude'
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1:5001'
if (!project.startsWith('demo-') || ![authHost, functionsHost, firestoreHost].every(host => /^(localhost|127\.0\.0\.1):\d+$/.test(host))) throw new Error('Somente emuladores locais demo-* são permitidos.')
const jwt = payload => `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.`
async function entrar(uid = 'acs-ficticio') {
  const googleToken = jwt({ sub: `google-${uid}`, email: `${uid}@ufms.br`, email_verified: true, aud: 'demo', iss: 'https://accounts.google.com', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })
  const resposta = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postBody: new URLSearchParams({ id_token: googleToken, providerId: 'google.com' }).toString(), requestUri: 'http://localhost', returnSecureToken: true }) })
  assert.equal(resposta.status, 200, 'Login institucional fictício deve funcionar no Auth Emulator')
  const body = await resposta.json()
  assert.equal(body.localId, uid, 'Seed da conta Google deve preservar o UID esperado')
  return body.idToken
}
async function callable(nome, data, token) {
  const resposta = await fetch(`http://${functionsHost}/${project}/southamerica-east1/${nome}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ data }) })
  const content = await resposta.text()
  assert.ok(resposta.headers.get('content-type')?.includes('application/json'), `Callable ${nome} indisponível (HTTP ${resposta.status}); confira região e reinicie Functions Emulator após recompilar.`)
  return { status: resposta.status, body: JSON.parse(content) }
}
const token = await entrar()
const lista = await callable('listarMeusVinculos', {}, token)
assert.equal(lista.status, 200)
assert.ok(lista.body.result.vinculos.some(v => v.uid === 'acs-ficticio' && v.tenantId === 'municipio-teste'))
assert.ok(lista.body.result.vinculos.every(v => v.uid === 'acs-ficticio'))
const selecionado = await callable('selecionarTenant', { tenantId: 'municipio-teste' }, token)
assert.equal(selecionado.status, 200)
assert.equal(selecionado.body.result.claims.perfil, 'ACS')
assert.equal(selecionado.body.result.claims.tenantId, 'municipio-teste')
const negado = await callable('selecionarTenant', { tenantId: 'outro-municipio' }, token)
assert.equal(negado.status, 403)
// Conta temporária evita invalidar a sessão ACS que o navegador está usando.
process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost
process.env.FIRESTORE_EMULATOR_HOST = firestoreHost
initializeApp({ projectId: project })
const db = getFirestore()
const adminAuth = getAuth()
const uid = `acs-smoke-${Date.now()}`
const base = { uid, tenantId: 'municipio-teste', municipioId: 'municipio-teste', perfil: 'ACS', equipeId: 'equipe-teste', microareaIds: ['microarea-teste'], status: 'ATIVO', versaoAcesso: 1 }
const vinculoRef = db.doc(`tenants/municipio-teste/vinculos/${uid}`)
await adminAuth.createUser({ uid, email: `${uid}@ufms.br`, emailVerified: true, providerToLink: { providerId: 'google.com', uid: `google-${uid}`, email: `${uid}@ufms.br` } })
try {
  await entrar(uid) // Materializa o provedor Google no registro Auth antes da aprovação.
  const adminToken = await entrar('admin-ficticio')
  const aprovado = await callable('gerirVinculo', { vinculo: base }, adminToken)
  assert.equal(aprovado.status, 200, `ADMIN deve aprovar novo vínculo institucional: ${JSON.stringify(aprovado.body)}`)
  assert.equal(aprovado.body.result.versaoAcesso, 1)
  assert.deepEqual((await vinculoRef.get()).data(), base)
  const sessaoSemClaims = await entrar(uid)
  assert.equal((await callable('selecionarTenant', { tenantId: 'municipio-teste' }, sessaoSemClaims)).status, 200)
  const tokenAtivo = await entrar(uid)
  const urlFamilia = `http://${firestoreHost}/v1/projects/${project}/databases/(default)/documents/tenants/municipio-teste/familias/familia-ficticia`
  const lerFamilia = t => fetch(urlFamilia, { headers: { Authorization: `Bearer ${t}` } })
  assert.equal((await lerFamilia(tokenAtivo)).status, 200, 'Novo ACS deve ler família de sua microárea')
  const revogado = await callable('gerirVinculo', { vinculo: { ...base, status: 'INATIVO', versaoAcesso: 2 } }, adminToken)
  assert.equal(revogado.status, 200, 'ADMIN deve revogar vínculo existente')
  assert.equal((await lerFamilia(tokenAtivo)).status, 403, 'Token anterior deve ser negado imediatamente pelas regras')
  assert.equal((await callable('selecionarTenant', { tenantId: 'municipio-teste' }, tokenAtivo)).status, 403)
  const listaRevogada = await callable('listarMeusVinculos', {}, tokenAtivo)
  assert.deepEqual(listaRevogada.body.result.vinculos, [])
  const versaoAntiga = await callable('gerirVinculo', { vinculo: { ...base, versaoAcesso: 2 } }, adminToken)
  assert.equal(versaoAntiga.status, 409, 'Atualização obsoleta não deve sobrescrever revogação')
  assert.equal((await vinculoRef.get()).data().status, 'INATIVO')
  const restaurado = await callable('gerirVinculo', { vinculo: { ...base, versaoAcesso: 3 } }, adminToken)
  assert.equal(restaurado.status, 200)
  assert.equal((await lerFamilia(tokenAtivo)).status, 403, 'Reativação não deve validar token de versão antiga')
  assert.equal((await callable('selecionarTenant', { tenantId: 'municipio-teste' }, tokenAtivo)).status, 200)
  assert.equal((await lerFamilia(await entrar(uid))).status, 200)
  const logs = await db.collection('tenants/municipio-teste/logs_auditoria').where('recursoId', '==', uid).get()
  assert.equal(logs.size, 3, 'Cada mutação confirmada deve criar um único evento de auditoria')
  assert.deepEqual(logs.docs.map(d => d.data().acao).sort(), ['APROVAR_VINCULO', 'APROVAR_VINCULO', 'REVOGAR_VINCULO'])
  for (const documento of logs.docs) {
    const log = documento.data()
    assert.equal(log.usuarioId, 'admin-ficticio')
    assert.equal(log.perfil, 'ADMIN')
    assert.ok(log.registradoEm.toDate())
    assert.deepEqual(Object.keys(log).sort(), ['acao', 'dataHora', 'municipioId', 'perfil', 'recursoId', 'recursoTipo', 'registradoEm', 'usuarioId'].sort())
  }
  console.log('Smoke aprovado: identidade, seleção, isolamento, aprovação/revogação ADMIN, token antigo bloqueado, reativação com versão nova e auditoria transacional.')
} finally {
  // Limpeza apenas da conta fictícia exclusiva deste teste; seed compartilhado preservado.
  await vinculoRef.delete()
  await adminAuth.deleteUser(uid)
}

