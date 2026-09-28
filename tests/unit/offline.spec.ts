import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { FilaCampo, IndexedDbSintetico, type ArmazemLocal, type RegistroLocal } from '../../app/offline/fila'
import { IndicadorRiscoCodigo } from '../../shared/domain/risk-engine/types'
import type { OperacaoAvaliacao } from '../../shared/domain/sincronizacao'
const escopo = { uid: 'demo-acs', tenantId: 'coxim' }
const operacao = (familiaId = 'demo-familia'): OperacaoAvaliacao => ({
  operacaoId: crypto.randomUUID(), tenantId: 'coxim', familiaId, versaoCadastroBase: 0,
  avaliacaoAnteriorId: null, versaoEscala: 'v1', coletadoEm: '2026-09-26T10:00:00.000Z',
  indicadores: Object.values(IndicadorRiscoCodigo).map(codigo => ({ codigo, ativo: false }))
})
beforeEach(async () => { await new Promise<void>((resolve, reject) => { const req = indexedDB.deleteDatabase('pet-saude-campo-sintetico'); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error) }) })
describe('fila local sintética', () => {
  it('descarte exige confirmação e preserva operação homônima de outro usuário', async () => {
    const store = new IndexedDbSintetico(['demo-familia']); const op = operacao()
    const a = new FilaCampo(store, escopo)
    const b = new FilaCampo(store, { ...escopo, uid: 'demo-outro' })
    await a.salvar(op); await b.salvar(op)
    await expect(a.descartar(op.operacaoId, false)).rejects.toThrow('CONFIRMACAO_NECESSARIA')
    expect(await a.listar()).toHaveLength(1)
    await a.descartar(op.operacaoId, true)
    expect(await a.listar()).toHaveLength(0); expect(await b.listar()).toHaveLength(1)
  })
  it('serializa instâncias concorrentes e impede reescrita do mesmo ID', async () => {
    const store = new IndexedDbSintetico(['demo-familia']); const op = operacao()
    const a = new FilaCampo(store, escopo); const b = new FilaCampo(store, escopo)
    const resultados = await Promise.allSettled([a.salvar(op), b.salvar(op)])
    expect(resultados.filter(item => item.status === 'fulfilled')).toHaveLength(1)
    expect(await a.listar()).toHaveLength(1)
    let envios = 0
    const enviar = async () => { envios++; return { operacaoId: op.operacaoId, status: 'CONFIRMADA' as const, registradoEm: '2026-09-26T11:00:00Z', avaliacaoId: 'a' } }
    await Promise.all([new FilaCampo(store, escopo, enviar).sincronizar(), new FilaCampo(store, escopo, enviar).sincronizar()])
    expect(envios).toBe(1)
  })
  it('preserva rascunho incompleto após reinício sem converter ausência em negativo', async () => {
    const store = new IndexedDbSintetico(['demo-familia'])
    const op = { ...operacao(), indicadores: [] }
    await new FilaCampo(store, escopo).salvar(op, 'rascunho')
    const retomada = new FilaCampo(store, escopo)
    expect((await retomada.listar())[0]?.operacao.indicadores).toEqual([])
    await expect(retomada.salvar(op, 'pendente')).rejects.toThrow()
    await retomada.salvar({ ...op, indicadores: operacao().indicadores }, 'pendente')
    expect((await retomada.listar())[0]?.estado).toBe('pendente')
  })
  it('preserva ID depois de resposta perdida e não repete rejeição de acesso', async () => {
    const store = new IndexedDbSintetico(['demo-familia']); const op = operacao(); let tentativas = 0
    const fila = new FilaCampo(store, escopo, async item => {
      expect(item.operacaoId).toBe(op.operacaoId); tentativas++
      if (tentativas === 1) throw new Error('rede')
      throw Object.assign(new Error('acesso'), { code: 'functions/permission-denied' })
    })
    await fila.salvar(op); await fila.sincronizar()
    expect((await fila.listar())[0]?.estado).toBe('pendente')
    await fila.sincronizar(); await fila.sincronizar()
    expect(tentativas).toBe(2); expect((await fila.listar())[0]?.estado).toBe('rejeitado')
  })
  it('recupera coleta após recriar serviço e isola usuário e município', async () => {
    const fila = new FilaCampo(new IndexedDbSintetico(['demo-familia', 'demo-a', 'demo-b']), escopo)
    await fila.salvar(operacao())
    expect(await new FilaCampo(new IndexedDbSintetico(['demo-familia', 'demo-a', 'demo-b']), escopo).listar()).toHaveLength(1)
    expect(await new FilaCampo(new IndexedDbSintetico(['demo-familia', 'demo-a', 'demo-b']), { ...escopo, uid: 'demo-outro' }).listar()).toHaveLength(0)
    expect(await new FilaCampo(new IndexedDbSintetico(['demo-familia', 'demo-a', 'demo-b']), { ...escopo, tenantId: 'corumba' }).listar()).toHaveLength(0)
    expect(await fila.podeEncerrarSessao()).toBe(false)
  })
  it('não confirma sem adaptador ou com recibo inválido', async () => {
    const store = new IndexedDbSintetico(['demo-familia', 'demo-a', 'demo-b'])
    const fila = new FilaCampo(store, escopo)
    await fila.salvar(operacao()); await fila.sincronizar()
    expect((await fila.listar())[0]?.estado).toBe('pendente')
    await new FilaCampo(store, escopo, async () => ({ operacaoId: 'outro', status: 'CONFIRMADA', registradoEm: 'hoje' })).sincronizar()
    expect((await fila.listar())[0]?.estado).toBe('pendente')
  })
  it('recupera enviando após interrupção e reenvia o mesmo ID', async () => {
    const store = new IndexedDbSintetico(['demo-familia', 'demo-a', 'demo-b']); const fila = new FilaCampo(store, escopo)
    const op = operacao(); await fila.salvar(op)
    await store.gravar({ ...(await fila.listar())[0]!, estado: 'enviando' })
    const ids: string[] = []
    const retomada = new FilaCampo(store, escopo, async item => { ids.push(item.operacaoId); return { operacaoId: item.operacaoId, status: 'CONFIRMADA', registradoEm: '2026-09-26T11:00:00Z', avaliacaoId: 'avaliacao-1' } })
    await retomada.sincronizar(); await retomada.sincronizar()
    expect(ids).toEqual([op.operacaoId]); expect(await retomada.podeEncerrarSessao()).toBe(true)
  })
  it('conflito bloqueia somente a família afetada', async () => {
    const store = new IndexedDbSintetico(['demo-familia', 'demo-a', 'demo-b'])
    const fila = new FilaCampo(store, escopo, async item => ({ operacaoId: item.operacaoId, status: item.familiaId === 'demo-a' ? 'CONFLITO' : 'CONFIRMADA', registradoEm: '2026-09-26T11:00:00Z', avaliacaoId: 'a' }))
    await fila.salvar(operacao('demo-a')); await fila.salvar(operacao('demo-a')); await fila.salvar(operacao('demo-b'))
    await fila.sincronizar()
    expect((await fila.listar()).map(item => item.estado).sort()).toEqual(['confirmado', 'conflito', 'pendente'])
  })
  it('falha de armazenamento é propagada sem anunciar salvamento', async () => {
    const store: ArmazemLocal = { listar: async () => [], remover: async () => {}, gravar: async (_item: RegistroLocal) => { throw new DOMException('quota', 'QuotaExceededError') } }
    await expect(new FilaCampo(store, escopo).salvar(operacao())).rejects.toThrow('quota')
  })
  it('nega persistência de IDs reais e operações alteradas após submissão', async () => {
    const fila = new FilaCampo(new IndexedDbSintetico(['demo-familia', 'demo-a', 'demo-b']), escopo)
    await expect(fila.salvar(operacao('familia-real'))).rejects.toThrow('SOMENTE_DADOS_SINTETICOS')
    const op = operacao(); await fila.salvar(op)
    await expect(fila.salvar(op)).rejects.toThrow('OPERACAO_IMUTAVEL')
  })
})
