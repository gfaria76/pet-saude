import { ref } from 'vue'
import { FAMILIAS_SINTETICAS } from './useFamilias'
import { FilaCampo, IndexedDbSintetico, type RegistroLocal } from '~/offline/fila'
import type { OperacaoAvaliacao } from '~~/shared/domain/sincronizacao'

const registros = ref<RegistroLocal[]>([])
const erro = ref('')
const ocupado = ref(false)
const fila = new FilaCampo(new IndexedDbSintetico(FAMILIAS_SINTETICAS.filter(item => item.municipioId === 'coxim').map(item => item.id)), { uid: 'demo-campo', tenantId: 'coxim' })
export function useCampoOffline() {
  async function atualizar() {
    try { registros.value = await fila.listar(); erro.value = '' }
    catch { erro.value = 'Não foi possível abrir o armazenamento deste aparelho.' }
  }
  async function salvar(operacao: OperacaoAvaliacao, estado: 'rascunho' | 'pendente' = 'pendente') {
    ocupado.value = true
    try { await fila.salvar(operacao, estado); await atualizar(); return true }
    catch { erro.value = 'Não foi salvo neste aparelho. Verifique o espaço disponível e tente novamente.'; return false }
    finally { ocupado.value = false }
  }
  async function descartar(operacaoId: string) {
    if (!window.confirm('Descartar esta coleta deste aparelho? As respostas serão apagadas e não poderão ser recuperadas.')) return
    try { await fila.descartar(operacaoId, true); await atualizar() }
    catch { erro.value = 'Não foi possível descartar a coleta. Ela permanece neste aparelho.' }
  }
  return { registros, erro, ocupado, atualizar, salvar, descartar, podeEncerrarSessao: () => fila.podeEncerrarSessao() }
}
