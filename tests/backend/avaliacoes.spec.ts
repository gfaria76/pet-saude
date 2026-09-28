import { beforeEach, describe, expect, it } from 'vitest'
import { initializeApp, getApps } from '../../functions/node_modules/firebase-admin/lib/app/index.js'
import { getFirestore } from '../../functions/node_modules/firebase-admin/lib/firestore/index.js'
import { processarAvaliacao } from '../../functions/src/avaliacoes'
import { IndicadorRiscoCodigo, FaixaRisco } from '../../shared/domain/risk-engine/types'
import { CONFIGURACAO_COELHO_SAVASSI_V1 } from '../../shared/domain/risk-engine/constants'

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Backend tests require Firestore Emulator')
const app = getApps()[0] ?? initializeApp({ projectId: 'demo-pet-saude' })
const db = getFirestore(app)
const tenant = 'municipio-teste'
const uid = 'profissional-teste'
const claims = { tenantId: tenant, municipioId: tenant, perfil: 'ACS', equipeId: 'equipe-teste', microareaIds: ['micro-teste'], versaoAcesso: 1 }
const auth = { uid, token: { ...claims, email: 'profissional-teste@ufms.br', email_verified: true, firebase: { sign_in_provider: 'google.com' } } } as any
const base = db.doc(`tenants/${tenant}`)
const operacao = () => ({ operacaoId: crypto.randomUUID(), tenantId: tenant, familiaId: 'familia-teste', versaoCadastroBase: 0, avaliacaoAnteriorId: null, versaoEscala: CONFIGURACAO_COELHO_SAVASSI_V1.versao, coletadoEm: '2026-01-01T12:00:00Z', indicadores: Object.values(IndicadorRiscoCodigo).map(codigo => ({ codigo, ativo: codigo === IndicadorRiscoCodigo.IND_ACAMADO })) })
beforeEach(async () => {
  await db.recursiveDelete(base)
  await base.collection('vinculos').doc(uid).set({ ...claims, uid, status: 'ATIVO' })
  await base.collection('domicilios').doc('dom-teste').set({ municipioId: tenant, equipeId: 'equipe-teste', microareaId: 'micro-teste' })
  await base.collection('individuos').doc('pessoa-teste').set({ familiaId: 'familia-teste', municipioId: tenant, equipeId: 'equipe-teste', microareaId: 'micro-teste' })
  await base.collection('familias').doc('familia-teste').set({ id: 'familia-teste', municipioId: tenant, equipeId: 'equipe-teste', microareaId: 'micro-teste', prontuarioFamiliar: 'TESTE', domicilioId: 'dom-teste', responsavelNome: 'Pessoa Fictícia', responsavelId: 'pessoa-teste', status: 'ATIVA', quantidadeMembros: 1, ultimaClassificacaoRisco: FaixaRisco.SEM_RISCO_R0, ultimaPontuacaoRisco: 0, versaoCadastro: 0 })
})
describe('escrita canônica de avaliação', () => {
  it('recalcula e grava atomicamente; retry devolve mesmo recibo sem duplicar histórico ou logs', async () => {
    const data = operacao()
    const primeiro = await processarAvaliacao({ auth, data }, db)
    expect(await processarAvaliacao({ auth, data }, db)).toEqual(primeiro)
    expect((await base.collection('avaliacoes_risco').get()).size).toBe(1)
    expect((await base.collection('logs_auditoria').get()).size).toBe(1)
    expect((await base.collection('familias').doc(data.familiaId).get()).data()?.ultimaAvaliacaoId).toBe(primeiro.avaliacaoId)
  })
  it('não aceita mesmo ID com conteúdo alterado', async () => {
    const data = operacao()
    await processarAvaliacao({ auth, data }, db)
    data.indicadores[0]!.ativo = !data.indicadores[0]!.ativo
    await expect(processarAvaliacao({ auth, data }, db)).rejects.toMatchObject({ code: 'already-exists' })
  })
  it('preserva operação conflitante sem sobrescrever avaliação concorrente', async () => {
    const resultados = await Promise.all([processarAvaliacao({ auth, data: operacao() }, db), processarAvaliacao({ auth, data: operacao() }, db)])
    expect(resultados.map(r => r.status).sort()).toEqual(['CONFIRMADA', 'CONFLITO'])
    expect((await base.collection('avaliacoes_risco').get()).size).toBe(1)
    const operacoes = await base.collection('operacoes').get()
    expect(operacoes.docs.find(d => d.data().recibo.status === 'CONFLITO')?.data().operacao.indicadores).toHaveLength(13)
  })
  it('detecta cadastro alterado', async () => {
    await base.collection('familias').doc('familia-teste').update({ versaoCadastro: 1 })
    expect(await processarAvaliacao({ auth, data: operacao() }, db)).toMatchObject({ status: 'CONFLITO', motivo: 'CADASTRO_ALTERADO' })
  })
  it('nega tenant cruzado e token com vínculo revogado inclusive retry', async () => {
    const data = operacao()
    await processarAvaliacao({ auth, data }, db)
    await expect(processarAvaliacao({ auth, data: { ...data, tenantId: 'outro' } }, db)).rejects.toMatchObject({ code: 'permission-denied' })
    await base.collection('vinculos').doc(uid).update({ status: 'INATIVO' })
    await expect(processarAvaliacao({ auth, data }, db)).rejects.toMatchObject({ code: 'permission-denied' })
  })
  it('nega ADMIN e referências individuais de outra família', async () => {
    await expect(processarAvaliacao({ auth: { ...auth, token: { ...auth.token, perfil: 'ADMIN' } }, data: operacao() }, db)).rejects.toMatchObject({ code: 'permission-denied' })
    const data = operacao()
    Object.assign(data.indicadores[0]!, { individuoId: 'pessoa-outra' })
    await base.collection('individuos').doc('pessoa-outra').set({ familiaId: 'outra', municipioId: tenant, equipeId: 'equipe-teste', microareaId: 'micro-teste' })
    await expect(processarAvaliacao({ auth, data }, db)).rejects.toMatchObject({ code: 'failed-precondition' })
  })
  it('nega versão de acesso vencida e família fora da microárea autorizada', async () => {
    await expect(processarAvaliacao({ auth: { ...auth, token: { ...auth.token, versaoAcesso: 2 } }, data: operacao() }, db)).rejects.toMatchObject({ code: 'permission-denied' })
    await base.collection('familias').doc('familia-teste').update({ microareaId: 'micro-outra' })
    await expect(processarAvaliacao({ auth, data: operacao() }, db)).rejects.toMatchObject({ code: 'permission-denied' })
  })
  it('rejeita respostas incompletas e payload de pontuação do cliente', async () => {
    const data = operacao()
    await expect(processarAvaliacao({ auth, data: { ...data, indicadores: [] } }, db)).rejects.toMatchObject({ code: 'invalid-argument' })
    await expect(processarAvaliacao({ auth, data: { ...data, pontuacaoTotal: 100 } }, db)).rejects.toMatchObject({ code: 'invalid-argument' })
  })
})
