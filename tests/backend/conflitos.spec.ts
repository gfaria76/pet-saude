import { beforeEach, describe, expect, it } from 'vitest'
import { initializeApp, getApps } from '../../functions/node_modules/firebase-admin/lib/app/index.js'
import { getFirestore } from '../../functions/node_modules/firebase-admin/lib/firestore/index.js'
import { processarConsultaConflitos } from '../../functions/src/conflitos'
import { processarAvaliacao } from '../../functions/src/avaliacoes'
import { IndicadorRiscoCodigo, FaixaRisco } from '../../shared/domain/risk-engine/types'
import { CONFIGURACAO_COELHO_SAVASSI_V1 } from '../../shared/domain/risk-engine/constants'

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Backend tests require Firestore Emulator')
const app = getApps()[0] ?? initializeApp({ projectId: 'demo-pet-saude' })
const db = getFirestore(app)
const tenant = 'municipio-conflitos'
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
async function conflito() {
  const data = operacao()
  await base.collection('familias').doc(data.familiaId).update({ versaoCadastro: 1 })
  await processarAvaliacao({ auth, data }, db)
  return data
}
const consulta = (operacaoId?: string) => processarConsultaConflitos({ auth, data: { tenantId: tenant, ...(operacaoId ? { operacaoId } : {}) } }, db)
describe('revisão autorizada de conflitos', () => {
  it('lista somente metadados e devolve detalhe minimizado do autor', async () => {
    const op = await conflito()
    const lista = await consulta()
    expect(lista.conflitos).toHaveLength(1)
    expect(lista).not.toHaveProperty('detalhe')
    expect(lista.conflitos[0]).not.toHaveProperty('operacao')
    const detalhe = (await consulta(op.operacaoId)).detalhe!
    expect(detalhe.operacao).toEqual(op)
    expect(detalhe.familia.versaoCadastro).toBe(1)
    expect(detalhe.familia).not.toHaveProperty('responsavelNome')
    expect(detalhe.avaliacaoAtual).toBeNull()
  })
  it('não retorna conflito de outro autor', async () => {
    const op = await conflito()
    const outro = { ...auth, uid: 'outro-profissional' }
    await base.collection('vinculos').doc(outro.uid).set({ ...claims, uid: outro.uid, status: 'ATIVO' })
    const request = { auth: outro, data: { tenantId: tenant } }
    expect((await processarConsultaConflitos(request, db)).conflitos).toEqual([])
    await expect(processarConsultaConflitos({ ...request, data: { ...request.data, operacaoId: op.operacaoId } }, db)).rejects.toMatchObject({ code: 'not-found' })
  })
  it('nega ADMIN, vínculo revogado, tenant cruzado e versão antiga', async () => {
    await conflito()
    for (const token of [{ ...auth.token, perfil: 'ADMIN' }, { ...auth.token, versaoAcesso: 2 }, { ...auth.token, tenantId: 'outro', municipioId: 'outro' }]) {
      await expect(processarConsultaConflitos({ auth: { ...auth, token }, data: { tenantId: tenant } }, db)).rejects.toMatchObject({ code: 'permission-denied' })
    }
    await base.collection('vinculos').doc(uid).update({ status: 'INATIVO' })
    await expect(consulta()).rejects.toMatchObject({ code: 'permission-denied' })
  })
  it('retira conflitos cujo território atual não está autorizado', async () => {
    const op = await conflito()
    await base.collection('familias').doc(op.familiaId).update({ microareaId: 'outra-microarea' })
    expect((await consulta()).conflitos).toEqual([])
    await expect(consulta(op.operacaoId)).rejects.toMatchObject({ code: 'not-found' })
  })
  it('retorna respostas atuais e preserva recibo original ao registrar nova operação', async () => {
    const original = await conflito()
    const atual = { ...operacao(), versaoCadastroBase: 1 }
    const primeiro = await processarAvaliacao({ auth, data: atual }, db)
    if (primeiro.status !== 'CONFIRMADA') throw new Error('Fixture sem avaliação')
    const detalhe = (await consulta(original.operacaoId)).detalhe!
    expect(detalhe.avaliacaoAtual?.respostas).toEqual(atual.indicadores)
    const canonica = (await base.collection('avaliacoes_risco').doc(primeiro.avaliacaoId).get()).data()!
    expect(canonica.id).toBe(primeiro.avaliacaoId)
    expect(canonica.id).not.toBe(atual.familiaId)
    expect(canonica).not.toHaveProperty('responsavelNome')
    expect(canonica).not.toHaveProperty('contato')
    const nova = { ...original, operacaoId: crypto.randomUUID(), versaoCadastroBase: detalhe.familia.versaoCadastro, avaliacaoAnteriorId: detalhe.familia.ultimaAvaliacaoId }
    expect((await processarAvaliacao({ auth, data: nova }, db)).status).toBe('CONFIRMADA')
    expect((await consulta(original.operacaoId)).detalhe?.recibo).toEqual(detalhe.recibo)
    expect((await base.collection('avaliacoes_risco').get()).size).toBe(2)
  })
  it('nega respostas atuais com território histórico fora do vínculo', async () => {
    const original = await conflito()
    const atual = await processarAvaliacao({ auth, data: { ...operacao(), versaoCadastroBase: 1 } }, db)
    if (atual.status !== 'CONFIRMADA') throw new Error('Fixture sem avaliação')
    await base.collection('avaliacoes_risco').doc(atual.avaliacaoId).update({ microareaId: 'outra' })
    await expect(consulta(original.operacaoId)).rejects.toMatchObject({ code: 'failed-precondition' })
  })
  it('pagina sem retornar operações confirmadas', async () => {
    await base.collection('familias').doc('familia-teste').update({ versaoCadastro: 1 })
    for (let i = 0; i < 21; i++) await processarAvaliacao({ auth, data: operacao() }, db)
    const primeira = await consulta()
    expect(primeira.conflitos).toHaveLength(20)
    const segunda = await processarConsultaConflitos({ auth, data: { tenantId: tenant, cursor: primeira.proximoCursor } }, db)
    expect(segunda.conflitos).toHaveLength(1)
    expect(segunda.proximoCursor).toBeNull()
  })
})
