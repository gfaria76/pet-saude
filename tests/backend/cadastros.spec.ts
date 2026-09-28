import { beforeEach, describe, expect, it } from 'vitest'
import { initializeApp, getApps } from '../../functions/node_modules/firebase-admin/lib/app/index.js'
import { getFirestore } from '../../functions/node_modules/firebase-admin/lib/firestore/index.js'
import { processarCadastro } from '../../functions/src/cadastros'
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Backend tests require Firestore Emulator')
const db = getFirestore(getApps()[0] ?? initializeApp({ projectId: 'demo-pet-saude' }))
const tenant = 'cadastro-municipio-teste'
const uid = 'cadastro-profissional-teste'
const claims = { tenantId: tenant, municipioId: tenant, perfil: 'ACS', equipeId: 'equipe-teste', microareaIds: ['micro-teste'], versaoAcesso: 1 }
const auth = { uid, token: { ...claims, email: 'cadastro-teste@ufms.br', email_verified: true, firebase: { sign_in_provider: 'google.com' } } } as any
const base = db.doc(`tenants/${tenant}`)
const criar = () => ({ tipo: 'CRIAR', operacaoId: crypto.randomUUID(), tenantId: tenant, equipeId: 'equipe-teste', microareaId: 'micro-teste', prontuarioFamiliar: 'FICTICIO', domicilio: { logradouro: 'Rua Fictícia', numero: '1', bairro: 'Bairro Fictício', quantidadeComodos: 1, quantidadeMoradores: 1, abastecimentoAgua: 'OUTRO', esgotamentoSanitario: 'OUTRO', destinoLixo: 'COLETADO', saneamentoInadequado: false, adensamentoExcessivo: false }, responsavel: { nome: 'Pessoa Fictícia Teste', dataNascimento: '2000-01-01', sexo: 'OUTRO', parentesco: 'Responsável', condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false } } })
const atualizar = (familiaId: string) => ({ tipo: 'ATUALIZAR', operacaoId: crypto.randomUUID(), tenantId: tenant, familiaId, versaoCadastroBase: 0, prontuarioFamiliar: 'ALTERADO-FICTICIO', status: 'ATIVA' })
const coordenacao = { uid, token: { ...auth.token, perfil: 'COORDENADOR_APS' } } as any
beforeEach(async () => {
  await db.recursiveDelete(base)
  await base.collection('vinculos').doc(uid).set({ ...claims, uid, status: 'ATIVO' })
  await base.collection('microareas').doc('micro-teste').set({ id: 'micro-teste', numero: '1', municipioId: tenant, equipeId: 'equipe-teste' })
  await base.collection('microareas').doc('micro-destino').set({ id: 'micro-destino', numero: '2', municipioId: tenant, equipeId: 'equipe-destino' })
})
describe('cadastro canônico', () => {
  it('cria entidades e três auditorias atomicamente; retry não duplica nem classifica', async () => {
    const data = criar()
    const recibo = await processarCadastro({ auth, data }, db)
    expect(await processarCadastro({ auth, data }, db)).toEqual(recibo)
    for (const colecao of ['familias', 'domicilios', 'individuos', 'operacoes_cadastro']) expect((await base.collection(colecao).get()).size).toBe(1)
    expect((await base.collection('logs_auditoria').get()).size).toBe(3)
    expect((await base.collection('avaliacoes_risco').get()).empty).toBe(true)
    expect(JSON.stringify((await base.collection('logs_auditoria').get()).docs.map(d => d.data()))).not.toContain('Pessoa Fictícia')
    await expect(processarCadastro({ auth, data: { ...data, prontuarioFamiliar: 'DIFERENTE' } }, db)).rejects.toMatchObject({ code: 'already-exists' })
  })
  it('serializa edições concorrentes com conflito e permite inativação auditada', async () => {
    const r = await processarCadastro({ auth, data: criar() }, db)
    const resultados = await Promise.all([processarCadastro({ auth, data: atualizar(r.familiaId) }, db), processarCadastro({ auth, data: { ...atualizar(r.familiaId), status: 'MUDOU_SE' } }, db)])
    expect(resultados.map(r => r.status).sort()).toEqual(['CONFIRMADA', 'CONFLITO'])
    expect((await base.collection('familias').doc(r.familiaId).get()).get('versaoCadastro')).toBe(1)
    expect((await base.collection('logs_auditoria').get()).size).toBe(4)
  })
  it('nega admin, município cruzado, microárea alheia e vínculo revogado inclusive retry', async () => {
    const data = criar()
    await expect(processarCadastro({ auth: { ...auth, token: { ...auth.token, perfil: 'ADMIN' } }, data }, db)).rejects.toMatchObject({ code: 'permission-denied' })
    await expect(processarCadastro({ auth, data: { ...data, tenantId: 'outro' } }, db)).rejects.toMatchObject({ code: 'permission-denied' })
    await expect(processarCadastro({ auth, data: { ...data, microareaId: 'micro-destino' } }, db)).rejects.toMatchObject({ code: 'permission-denied' })
    await processarCadastro({ auth, data }, db)
    await base.collection('vinculos').doc(uid).update({ status: 'INATIVO' })
    await expect(processarCadastro({ auth, data }, db)).rejects.toMatchObject({ code: 'permission-denied' })
  })
  it('transfere cadastro inteiro pela coordenação preservando avaliações e logs anteriores', async () => {
    const r = await processarCadastro({ auth, data: criar() }, db)
    const antiga = { familiaId: r.familiaId, municipioId: tenant, equipeId: 'equipe-teste', microareaId: 'micro-teste', marcador: 'HISTORICO_IMUTAVEL' }
    await base.collection('avaliacoes_risco').doc('avaliacao-teste').set(antiga)
    const logs = (await base.collection('logs_auditoria').get()).docs.map(d => ({ id: d.id, data: d.data() }))
    const data = { tipo: 'TRANSFERIR', operacaoId: crypto.randomUUID(), tenantId: tenant, familiaId: r.familiaId, versaoCadastroBase: 0, equipeId: 'equipe-destino', microareaId: 'micro-destino' }
    await expect(processarCadastro({ auth, data }, db)).rejects.toMatchObject({ code: 'permission-denied' })
    await base.collection('vinculos').doc(uid).update({ perfil: 'COORDENADOR_APS' })
    expect(await processarCadastro({ auth: coordenacao, data }, db)).toMatchObject({ status: 'CONFIRMADA', versaoCadastro: 1 })
    for (const colecao of ['familias', 'domicilios', 'individuos']) expect((await base.collection(colecao).get()).docs[0]!.data()).toMatchObject({ equipeId: 'equipe-destino', microareaId: 'micro-destino' })
    expect((await base.collection('avaliacoes_risco').doc('avaliacao-teste').get()).data()).toEqual(antiga)
    for (const log of logs) expect((await base.collection('logs_auditoria').doc(log.id).get()).data()).toEqual(log.data)
  })
  it('nega destino incompatível e nascimento futuro sem criar registros', async () => {
    const data = criar()
    await base.collection('microareas').doc('micro-teste').update({ equipeId: 'outra-equipe' })
    await expect(processarCadastro({ auth, data }, db)).rejects.toMatchObject({ code: 'failed-precondition' })
    await expect(processarCadastro({ auth, data: { ...data, responsavel: { ...data.responsavel, dataNascimento: '2099-01-01' } } }, db, '2026-01-01T00:00:00Z')).rejects.toMatchObject({ code: 'invalid-argument' })
    expect((await base.collection('familias').get()).empty).toBe(true)
    expect((await base.collection('logs_auditoria').get()).empty).toBe(true)
  })
  it('rejeita identidade armazenada inconsistente e token vencido', async () => {
    const r = await processarCadastro({ auth, data: criar() }, db)
    await expect(processarCadastro({ auth: { ...auth, token: { ...auth.token, versaoAcesso: 2 } }, data: atualizar(r.familiaId) }, db)).rejects.toMatchObject({ code: 'permission-denied' })
    await base.collection('familias').doc(r.familiaId).update({ id: 'id-diferente' })
    await expect(processarCadastro({ auth, data: atualizar(r.familiaId) }, db)).rejects.toMatchObject({ code: 'failed-precondition' })
  })
  it('nega transferência de domicílio compartilhado sem escrita parcial', async () => {
    const r = await processarCadastro({ auth, data: criar() }, db)
    const familia = (await base.collection('familias').doc(r.familiaId).get()).data()!
    await base.collection('familias').doc('outra-familia-ficticia').set({ ...familia, id: 'outra-familia-ficticia' })
    await base.collection('vinculos').doc(uid).update({ perfil: 'COORDENADOR_APS' })
    await expect(processarCadastro({ auth: coordenacao, data: { tipo: 'TRANSFERIR', operacaoId: crypto.randomUUID(), tenantId: tenant, familiaId: r.familiaId, versaoCadastroBase: 0, equipeId: 'equipe-destino', microareaId: 'micro-destino' } }, db)).rejects.toMatchObject({ code: 'failed-precondition' })
    expect((await base.collection('familias').doc(r.familiaId).get()).data()).toEqual(familia)
  })
})
