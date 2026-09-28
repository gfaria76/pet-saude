import { z } from 'zod'
import { IndicadorRiscoCodigo } from '~~/shared/domain/risk-engine/types'
import { OperacaoAvaliacaoSchema, type OperacaoAvaliacao, type ReciboOperacao } from '~~/shared/domain/sincronizacao'

export interface EscopoLocal { uid: string; tenantId: string }
export type EstadoLocal = 'rascunho' | 'pendente' | 'enviando' | 'confirmado' | 'conflito' | 'rejeitado' | 'requer_login'
export interface RegistroLocal { chave: string; escopo: EscopoLocal; operacao: OperacaoAvaliacao; estado: EstadoLocal; ordem: number; recibo?: ReciboOperacao }
export interface ArmazemLocal {
  listar(escopo: EscopoLocal): Promise<RegistroLocal[]>
  gravar(registro: RegistroLocal): Promise<void>
  remover(escopo: EscopoLocal, operacaoId: string): Promise<void>
}
export type EnviarOperacao = (operacao: OperacaoAvaliacao) => Promise<ReciboOperacao>
export const chaveLocal = (escopo: EscopoLocal, id: string) => JSON.stringify([escopo.uid, escopo.tenantId, id])

// Web Locks serializes tabs. The in-process fallback also serializes service instances.
const bloqueios = new Map<string, Promise<unknown>>()
async function exclusivo<T>(escopo: EscopoLocal, trabalho: () => Promise<T>): Promise<T> {
  const nome = `pet-saude-fila:${JSON.stringify([escopo.uid, escopo.tenantId])}`
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request(nome, trabalho)
  const anterior = bloqueios.get(nome) ?? Promise.resolve()
  const atual = anterior.catch(() => undefined).then(trabalho)
  bloqueios.set(nome, atual)
  try { return await atual } finally { if (bloqueios.get(nome) === atual) bloqueios.delete(nome) }
}

export class FilaCampo {
  private executando = false
  constructor(private armazem: ArmazemLocal, readonly escopo: EscopoLocal, private enviar?: EnviarOperacao) {}
  listar() { return this.armazem.listar(this.escopo) }
  async salvar(operacao: OperacaoAvaliacao, estado: 'rascunho' | 'pendente' = 'pendente') {
    return exclusivo(this.escopo, () => this.gravarOperacao(operacao, estado))
  }
  private async gravarOperacao(operacao: OperacaoAvaliacao, estado: 'rascunho' | 'pendente') {
    operacao = estado === 'rascunho' ? OperacaoAvaliacaoSchema.extend({ indicadores: z.array(z.object({ codigo: z.enum(IndicadorRiscoCodigo), ativo: z.boolean(), individuoId: z.string().optional() }).strict()).max(Object.values(IndicadorRiscoCodigo).length).refine(items => new Set(items.map(i => i.codigo)).size === items.length) }).parse(operacao) : OperacaoAvaliacaoSchema.parse(operacao)
    if (operacao.tenantId !== this.escopo.tenantId) throw new Error('TERRITORIO_INVALIDO')
    const existentes = await this.listar()
    const anterior = existentes.find(item => item.operacao.operacaoId === operacao.operacaoId)
    if (anterior && anterior.estado !== 'rascunho') throw new Error('OPERACAO_IMUTAVEL')
    await this.armazem.gravar({ chave: chaveLocal(this.escopo, operacao.operacaoId), escopo: this.escopo, operacao, estado, ordem: anterior?.ordem ?? Math.max(Date.now(), ...existentes.map(item => item.ordem + 1)) })
  }
  async descartar(operacaoId: string, confirmado: boolean) {
    if (!confirmado) throw new Error('CONFIRMACAO_NECESSARIA')
    return exclusivo(this.escopo, async () => {
      const item = (await this.listar()).find(item => item.operacao.operacaoId === operacaoId)
      if (!item || item.estado === 'confirmado' || item.estado === 'enviando') throw new Error('DESCARTE_NAO_PERMITIDO')
      await this.armazem.remover(this.escopo, operacaoId)
    })
  }
  async podeEncerrarSessao() { return (await this.listar()).every(item => item.estado === 'confirmado') }
  async sincronizar() {
    await exclusivo(this.escopo, () => this.processar())
  }
  private async processar() {
    if (this.executando || !this.enviar) return
    this.executando = true
    try {
      const bloqueadas = new Set<string>()
      for (const item of (await this.listar()).sort((a, b) => a.ordem - b.ordem)) {
        if (item.estado === 'confirmado') continue
        if (bloqueadas.has(item.operacao.familiaId)) continue
        if (['rascunho', 'conflito', 'rejeitado', 'requer_login'].includes(item.estado)) {
          bloqueadas.add(item.operacao.familiaId)
          continue
        }
        await this.armazem.gravar({ ...item, estado: 'enviando' })
        let recibo: ReciboOperacao
        try { recibo = await this.enviar(item.operacao) }
        catch (erro) {
          const codigo = (erro as { code?: string }).code
          const estado = codigo === 'functions/unauthenticated' ? 'requer_login' : codigo === 'functions/permission-denied' || codigo === 'functions/invalid-argument' ? 'rejeitado' : 'pendente'
          await this.armazem.gravar({ ...item, estado })
          bloqueadas.add(item.operacao.familiaId)
          continue
        }
        if (recibo.operacaoId !== item.operacao.operacaoId || !['CONFIRMADA', 'CONFLITO'].includes(recibo.status) || !z.iso.datetime({ offset: true }).safeParse(recibo.registradoEm).success || (recibo.status === 'CONFIRMADA' && !recibo.avaliacaoId)) {
          await this.armazem.gravar({ ...item, estado: 'pendente' })
          bloqueadas.add(item.operacao.familiaId)
          continue
        }
        await this.armazem.gravar({ ...item, estado: recibo.status === 'CONFIRMADA' ? 'confirmado' : 'conflito', recibo })
        // Subsequent local assessments retain their explicit base. The server detects stale bases.
        if (recibo.status === 'CONFLITO') bloqueadas.add(item.operacao.familiaId)
      }
    } finally { this.executando = false }
  }
}

/** Only synthetic data is enabled until institutional device/retention policy is approved. */
export class IndexedDbSintetico implements ArmazemLocal {
  constructor(private familiasPermitidas: readonly string[] = []) {}
  private async abrir(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') throw new Error('ARMAZENAMENTO_INDISPONIVEL')
    return new Promise((resolve, reject) => {
      const pedido = indexedDB.open('pet-saude-campo-sintetico', 1)
      pedido.onupgradeneeded = () => pedido.result.createObjectStore('operacoes', { keyPath: 'chave' })
      pedido.onsuccess = () => resolve(pedido.result)
      pedido.onerror = () => reject(new Error('ARMAZENAMENTO_INDISPONIVEL'))
      pedido.onblocked = () => reject(new Error('ARMAZENAMENTO_BLOQUEADO'))
    })
  }
  async listar(escopo: EscopoLocal): Promise<RegistroLocal[]> {
    const db = await this.abrir()
    return new Promise((resolve, reject) => {
      const transacao = db.transaction('operacoes', 'readonly')
      const pedido = transacao.objectStore('operacoes').getAll()
      transacao.oncomplete = () => { db.close(); resolve((pedido.result as RegistroLocal[]).filter(item => item.escopo.uid === escopo.uid && item.escopo.tenantId === escopo.tenantId)) }
      transacao.onabort = transacao.onerror = () => { db.close(); reject(new Error('FALHA_LEITURA_LOCAL')) }
    })
  }
  async remover(escopo: EscopoLocal, operacaoId: string): Promise<void> {
    const db = await this.abrir()
    return new Promise((resolve, reject) => {
      const transacao = db.transaction('operacoes', 'readwrite')
      transacao.objectStore('operacoes').delete(chaveLocal(escopo, operacaoId))
      transacao.oncomplete = () => { db.close(); resolve() }
      transacao.onabort = transacao.onerror = () => { db.close(); reject(new Error('FALHA_DESCARTE_LOCAL')) }
    })
  }
  async gravar(registro: RegistroLocal): Promise<void> {
    if (!registro.escopo.uid.startsWith('demo-') || !this.familiasPermitidas.includes(registro.operacao.familiaId)) throw new Error('SOMENTE_DADOS_SINTETICOS')
    const db = await this.abrir()
    return new Promise((resolve, reject) => {
      const transacao = db.transaction('operacoes', 'readwrite')
      transacao.objectStore('operacoes').put(registro)
      transacao.oncomplete = () => { db.close(); resolve() }
      transacao.onabort = transacao.onerror = () => { db.close(); reject(new Error('FALHA_SALVAMENTO_LOCAL')) }
    })
  }
}
