<script setup lang="ts">
import { criarRepositorioFamilias, type FamiliaVersionada } from '~/repositories/familias'
import { criarEnvioOperacao } from '~/services/operacoesRemotas'
import { IndicadorRiscoCodigo } from '~~/shared/domain/risk-engine/types'
import { CONFIGURACAO_COELHO_SAVASSI_V1, METADADOS_INDICADORES } from '~~/shared/domain/risk-engine/constants'
import type { AvaliacaoRiscoDoc } from '~~/shared/domain/schemas'
import type { OperacaoAvaliacao, ReciboOperacao } from '~~/shared/domain/sincronizacao'

const { $autenticacao: sessao, $firestore, $firebaseApp } = useNuxtApp()
const { identidade, acesso, inicializado } = sessao
const historico = ref<AvaliacaoRiscoDoc[]>([])
const explicacao = ref<AvaliacaoRiscoDoc | null>(null)
const familias = ref<FamiliaVersionada[]>([])
const proximaPagina = ref<string | null>(null)
const consultado = ref(false)
const selecionada = ref<FamiliaVersionada | null>(null)
const respostas = reactive<Partial<Record<IndicadorRiscoCodigo, boolean>>>({})
const indicadores = Object.values(IndicadorRiscoCodigo)
const carregando = ref(false)
const enviando = ref(false)
const erro = ref('')
const recibo = ref<ReciboOperacao | null>(null)
const operacaoPendente = shallowRef<OperacaoAvaliacao | null>(null)
const completo = computed(() => indicadores.every(codigo => typeof respostas[codigo] === 'boolean'))
let revisao = 0
function limpar() {
  selecionada.value = null
  historico.value = []
  explicacao.value = null
  recibo.value = null
  operacaoPendente.value = null
  for (const codigo of indicadores) delete respostas[codigo]
}
watch([identidade, acesso], () => { ++revisao; familias.value = []; proximaPagina.value = null; consultado.value = false; limpar(); erro.value = ''; carregando.value = false; enviando.value = false })
async function carregar(mais = false) {
  if (!$firestore || !acesso.value || carregando.value) return
  const atual = revisao
  carregando.value = true
  erro.value = ''
  try {
    const resultado = await criarRepositorioFamilias($firestore, { ...acesso.value, microareaIds: [...acesso.value.microareaIds] }).listarPagina({ apos: mais ? proximaPagina.value ?? undefined : undefined })
    if (atual === revisao) {
      familias.value = mais ? [...new Map([...familias.value, ...resultado.familias].map(f => [f.id, f])).values()] : resultado.familias
      proximaPagina.value = resultado.proximo
      consultado.value = true
    }
  } catch { if (atual === revisao) erro.value = 'Não foi possível consultar as famílias. Verifique sua conexão e o vínculo territorial.' }
  finally { if (atual === revisao) carregando.value = false }
}
async function carregarHistorico(familia: FamiliaVersionada) {
  if (!$firestore || !acesso.value) return
  const atual = revisao
  try {
    const resultado = await criarRepositorioFamilias($firestore, { ...acesso.value, microareaIds: [...acesso.value.microareaIds] }).historico(familia.id)
    if (atual === revisao && selecionada.value?.id === familia.id) historico.value = resultado
  } catch { if (atual === revisao) erro.value = 'Não foi possível carregar o histórico. Verifique seu acesso e conexão.' }
}
async function selecionar(familia: FamiliaVersionada) {
  limpar()
  selecionada.value = familia
  await carregarHistorico(familia)
}
async function salvar() {
  const familia = selecionada.value
  if (!familia || !completo.value || !acesso.value || !identidade.value || !$firebaseApp || enviando.value) return
  const atual = revisao
  enviando.value = true
  erro.value = ''
  // Mantém ID e conteúdo em retry após perda da resposta do servidor.
  operacaoPendente.value ??= {
    operacaoId: crypto.randomUUID(), tenantId: acesso.value.tenantId, familiaId: familia.id,
    versaoCadastroBase: familia.versaoCadastro, avaliacaoAnteriorId: familia.ultimaAvaliacaoId ?? null,
    versaoEscala: CONFIGURACAO_COELHO_SAVASSI_V1.versao, coletadoEm: new Date().toISOString(),
    indicadores: indicadores.map(codigo => ({ codigo, ativo: respostas[codigo]! }))
  }
  try {
    const resultado = await criarEnvioOperacao($firebaseApp)(operacaoPendente.value)
    if (atual !== revisao) return
    recibo.value = resultado
    if (resultado.status === 'CONFIRMADA') { await carregar(); await carregarHistorico(familia) }
  } catch { if (atual === revisao) erro.value = 'Envio sem confirmação. Suas respostas permanecem nesta tela. Tente novamente com a mesma operação ou verifique seu acesso.' }
  finally { if (atual === revisao) enviando.value = false }
}
function impedirFechamento(evento: BeforeUnloadEvent) {
  if (selecionada.value && !recibo.value && indicadores.some(codigo => respostas[codigo] !== undefined)) {
    evento.preventDefault()
    evento.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', impedirFechamento))
onUnmounted(() => window.removeEventListener('beforeunload', impedirFechamento))
onBeforeRouteLeave(() => {
  if (selecionada.value && !recibo.value && indicadores.some(codigo => respostas[codigo] !== undefined)) return window.confirm('Há respostas ainda sem confirmação. Sair desta página descarta as respostas da tela. Deseja sair?')
})
</script>

<template>
  <section class="space-y-6" aria-labelledby="titulo-operacional">
    <h1 id="titulo-operacional" class="text-2xl font-bold">Área operacional</h1>
    <p class="text-muted">Consulte famílias do seu território e registre avaliações com confirmação do servidor.</p>
    <UAlert color="neutral" variant="outline" title="Escala em validação" description="Os pesos e cortes ainda dependem de validação institucional. Este ambiente não está liberado para uso assistencial." />
    <p v-if="!inicializado" role="status">Verificando sessão…</p>
    <template v-else-if="!identidade || !acesso">
      <p>Entre com sua conta institucional e selecione um município autorizado.</p>
      <UButton to="/login">Entrar e selecionar município</UButton>
    </template>
    <UAlert v-else-if="acesso.perfil === 'ADMIN'" title="Perfil administrativo" description="Este perfil não tem acesso aos dados de saúde das famílias." />
    <template v-else>
      <p class="text-sm">Município: {{ acesso.municipioId }} · {{ acesso.perfil }}</p>
      <nav class="flex flex-wrap gap-3" aria-label="Ações institucionais">
        <UButton to="/cadastro" color="neutral" variant="outline" class="min-h-11">Cadastrar família</UButton>
        <UButton to="/conflitos" color="neutral" variant="outline" class="min-h-11">Revisar conflitos</UButton>
        <UButton v-if="acesso.perfil === 'COORDENADOR_APS'" to="/transferencia" color="neutral" variant="outline" class="min-h-11">Transferir ou inativar família</UButton>
      </nav>
      <UAlert v-if="erro" color="error" :title="erro" role="alert" />
      <UButton :loading="carregando" :disabled="enviando" @click="carregar()">Consultar famílias do território</UButton>
      <p v-if="consultado && !familias.length && !erro" role="status">Nenhuma família encontrada no seu território.</p>
      <ul v-if="familias.length" class="space-y-2" aria-label="Famílias autorizadas">
        <li v-for="familia in familias" :key="familia.id">
          <UButton color="neutral" variant="outline" :disabled="!!selecionada || enviando || familia.status !== 'ATIVA'" class="min-h-11" @click="selecionar(familia)">Prontuário {{ familia.prontuarioFamiliar }}</UButton>
          <span class="ml-2 text-sm text-muted">{{ familia.status !== 'ATIVA' ? 'Família inativa' : familia.ultimaAvaliacaoId ? 'Com avaliação registrada' : 'Sem avaliação' }}</span>
        </li>
      </ul>
      <UButton v-if="proximaPagina" :loading="carregando" :disabled="enviando" color="neutral" variant="outline" @click="carregar(true)">Carregar mais famílias</UButton>
      <form v-if="selecionada" class="space-y-5" @submit.prevent="salvar">
        <h2 class="text-xl font-semibold">Avaliar prontuário {{ selecionada.prontuarioFamiliar }}</h2>
        <div v-if="historico.length" class="space-y-2">
          <h3 class="font-semibold">Histórico confirmado</h3>
          <div v-for="avaliacao in historico" :key="avaliacao.id" class="flex flex-wrap items-center gap-3">
            <span class="text-sm">{{ new Date(avaliacao.dataAvaliacao).toLocaleString('pt-BR') }}</span>
            <BadgeRiscoFamiliar :classificacao="avaliacao.classificacao" :pontuacao="avaliacao.pontuacaoTotal" @click="explicacao = avaliacao" />
          </div>
        </div>
        <p class="text-sm text-muted">Responda todos os indicadores. As respostas ficam apenas nesta tela até a confirmação. Fechar ou recarregar a página perde respostas não confirmadas.</p>
        <fieldset v-for="codigo in indicadores" :key="codigo" :disabled="!!operacaoPendente" class="rounded-lg border border-default p-4">
          <legend class="px-1 font-medium">{{ METADADOS_INDICADORES[codigo].descricao }}</legend>
          <div class="flex gap-6">
            <label class="flex min-h-11 items-center gap-2"><input v-model="respostas[codigo]" type="radio" :name="codigo" :value="true"> Sim</label>
            <label class="flex min-h-11 items-center gap-2"><input v-model="respostas[codigo]" type="radio" :name="codigo" :value="false"> Não</label>
          </div>
        </fieldset>
        <UAlert v-if="recibo?.status === 'CONFIRMADA'" color="success" variant="subtle" title="Avaliação confirmada" description="Histórico preservado e resumo atualizado." role="status" />
        <UAlert v-else-if="recibo?.status === 'CONFLITO'" color="warning" title="Revisão necessária" description="O cadastro ou a avaliação mudou desde sua leitura. A operação foi preservada no servidor sem substituir o histórico. Consulte os dados atuais e faça uma nova avaliação." role="status" />
        <UButton v-if="recibo?.status === 'CONFLITO'" to="/conflitos" variant="outline">Comparar e revisar conflito</UButton>
        <UButton v-if="!recibo" type="submit" :disabled="!completo" :loading="enviando">{{ operacaoPendente ? 'Tentar confirmar novamente' : 'Enviar avaliação' }}</UButton>
        <UButton v-else color="neutral" variant="outline" @click="limpar">Concluir e voltar à lista</UButton>
      </form>
    </template>
    <DrawerExplicativoRisco :aberto="!!explicacao" :avaliacao="explicacao" :total-avaliacoes="historico.length" :prontuario="selecionada?.prontuarioFamiliar" @fechar="explicacao = null" @reavaliar="explicacao = null" />
  </section>
</template>
