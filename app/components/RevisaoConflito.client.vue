<script setup lang="ts">
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ResultadoConsultaConflitosSchema, type RevisaoConflito, type ResumoConflito } from '~~/shared/domain/conflitos'
import { METADADOS_INDICADORES, CONFIGURACAO_COELHO_SAVASSI_V1 } from '~~/shared/domain/risk-engine/constants'
import { IndicadorRiscoCodigo } from '~~/shared/domain/risk-engine/types'
import type { OperacaoAvaliacao, ReciboOperacao } from '~~/shared/domain/sincronizacao'
import { criarEnvioOperacao } from '~/services/operacoesRemotas'
const { $autenticacao: sessao, $firebaseApp } = useNuxtApp()
const { identidade, acesso } = sessao
const lista = ref<ResumoConflito[]>([])
const detalhe = ref<RevisaoConflito | null>(null)
const cursor = ref<string | null>(null)
const respostas = reactive<Partial<Record<IndicadorRiscoCodigo, boolean>>>({})
const indicadores = Object.values(IndicadorRiscoCodigo)
const confirmado = ref(false)
const ocupado = ref(false)
const erro = ref('')
const recibo = ref<ReciboOperacao | null>(null)
const pendente = shallowRef<OperacaoAvaliacao | null>(null)
let revisao = 0
function limparRevisao() {
  detalhe.value = null; confirmado.value = false; recibo.value = null; pendente.value = null
  for (const codigo of indicadores) delete respostas[codigo]
}
watch([identidade, acesso], () => { revisao++; lista.value = []; cursor.value = null; limparRevisao(); erro.value = ''; ocupado.value = false })
async function consultar(operacaoId?: string, proxima = false) {
  if (!$firebaseApp || !acesso.value || ocupado.value) return
  if (temRespostasPendentes() && !window.confirm('Descartar as respostas desta revisão e consultar novamente?')) return
  const atual = ++revisao
  ocupado.value = true; erro.value = ''; limparRevisao()
  try {
    const chamar = httpsCallable(getFunctions($firebaseApp, 'southamerica-east1'), 'consultarConflitos')
    const resultado = ResultadoConsultaConflitosSchema.parse((await chamar({ tenantId: acesso.value.tenantId, ...(operacaoId ? { operacaoId } : {}), ...(proxima && cursor.value ? { cursor: cursor.value } : {}) })).data)
    if (atual !== revisao) return
    if (operacaoId) detalhe.value = resultado.detalhe ?? null
    else { lista.value = resultado.conflitos; cursor.value = resultado.proximoCursor }
  } catch { if (atual === revisao) erro.value = 'Não foi possível consultar os conflitos. Verifique a conexão e seu vínculo territorial.' }
  finally { if (atual === revisao) ocupado.value = false }
}
function temRespostasPendentes() { return !recibo.value && indicadores.some(c => respostas[c] !== undefined) }
function impedirFechamento(evento: BeforeUnloadEvent) {
  if (temRespostasPendentes()) { evento.preventDefault(); evento.returnValue = '' }
}
onMounted(() => window.addEventListener('beforeunload', impedirFechamento))
onUnmounted(() => window.removeEventListener('beforeunload', impedirFechamento))
onBeforeRouteLeave(() => !temRespostasPendentes() || window.confirm('Sair descarta as respostas desta revisão. Deseja sair?'))
const completo = computed(() => indicadores.every(c => typeof respostas[c] === 'boolean'))
function respostaAtual(codigo: IndicadorRiscoCodigo) {
  const resposta = detalhe.value?.avaliacaoAtual?.respostas.find(i => i.codigo === codigo)
  return resposta ? (resposta.ativo ? 'Sim' : 'Não') : 'Sem avaliação atual'
}
async function enviar() {
  const d = detalhe.value
  if (!d || !$firebaseApp || !completo.value || !confirmado.value || ocupado.value || d.familia.status !== 'ATIVA') return
  const atual = revisao
  pendente.value ??= {
    ...d.operacao, operacaoId: crypto.randomUUID(), versaoCadastroBase: d.familia.versaoCadastro,
    avaliacaoAnteriorId: d.familia.ultimaAvaliacaoId, versaoEscala: CONFIGURACAO_COELHO_SAVASSI_V1.versao,
    coletadoEm: new Date().toISOString(), indicadores: indicadores.map(codigo => {
      const original = d.operacao.indicadores.find(i => i.codigo === codigo)!
      return { codigo, ativo: respostas[codigo]!, ...(original.individuoId && respostas[codigo] ? { individuoId: original.individuoId } : {}) }
    })
  }
  ocupado.value = true; erro.value = ''
  try { const r = await criarEnvioOperacao($firebaseApp)(pendente.value); if (atual === revisao) recibo.value = r }
  catch { if (atual === revisao) erro.value = 'Envio sem confirmação. Tente novamente para consultar o resultado da mesma operação.' }
  finally { if (atual === revisao) ocupado.value = false }
}
</script>
<template>
  <section class="space-y-5">
    <h1 class="text-2xl font-bold">Revisar conflitos</h1>
    <p>Compare a operação preservada com a avaliação atual e responda novamente todos os indicadores. A revisão cria outra operação; o registro original permanece no histórico.</p>
    <UButton to="/operacional" color="neutral" variant="outline">Voltar à área operacional</UButton>
    <p v-if="!identidade || !acesso">Entre e selecione um município em <NuxtLink to="/login" class="underline">Login</NuxtLink>.</p>
    <p v-else-if="acesso.perfil === 'ADMIN'">O perfil administrativo não acessa dados de saúde.</p>
    <template v-else>
      <UAlert v-if="erro" color="error" :title="erro" role="alert" />
      <UButton :disabled="ocupado || !!pendente" @click="consultar()">Consultar meus conflitos</UButton>
      <ul class="space-y-2">
        <li v-for="item in lista" :key="item.operacaoId"><UButton color="neutral" variant="outline" :disabled="ocupado || !!pendente" @click="consultar(item.operacaoId)">Família {{ item.familiaId }} · {{ new Date(item.registradoEm).toLocaleString('pt-BR') }}</UButton></li>
      </ul>
      <UButton v-if="cursor" :disabled="ocupado || !!pendente" @click="consultar(undefined, true)">Próxima página</UButton>
      <form v-if="detalhe" class="space-y-4" @submit.prevent="enviar">
        <h2 class="text-xl font-semibold">Família {{ detalhe.familia.id }}</h2>
        <p>Cadastro: versão {{ detalhe.operacao.versaoCadastroBase }} → {{ detalhe.familia.versaoCadastro }}. Avaliação base: {{ detalhe.operacao.avaliacaoAnteriorId ?? 'nenhuma' }} → {{ detalhe.familia.ultimaAvaliacaoId ?? 'nenhuma' }}.</p>
        <p>Escala da operação: {{ detalhe.operacao.versaoEscala }}. Atual: {{ detalhe.avaliacaoAtual?.versaoEscala ?? 'sem avaliação' }}. Nova revisão: {{ CONFIGURACAO_COELHO_SAVASSI_V1.versao }}.</p>
        <p>Coleta preservada: {{ new Date(detalhe.operacao.coletadoEm).toLocaleString('pt-BR') }}. Avaliação atual: {{ detalhe.avaliacaoAtual ? new Date(detalhe.avaliacaoAtual.dataAvaliacao).toLocaleString('pt-BR') : 'nenhuma' }}.</p>
        <fieldset v-for="codigo in indicadores" :key="codigo" :disabled="!!pendente" class="border border-default rounded-lg p-4">
          <legend class="font-medium">{{ METADADOS_INDICADORES[codigo].descricao }}</legend>
          <p>Operação preservada: {{ detalhe.operacao.indicadores.find(i => i.codigo === codigo)?.ativo ? 'Sim' : 'Não' }} · Atual: {{ respostaAtual(codigo) }}</p>
          <p v-if="detalhe.operacao.indicadores.find(i => i.codigo === codigo)?.individuoId" class="text-sm">Referência original de membro: {{ detalhe.operacao.indicadores.find(i => i.codigo === codigo)?.individuoId }}. Confirme sua pertinência ao marcar Sim.</p>
          <p v-if="detalhe.avaliacaoAtual?.respostas.find(i => i.codigo === codigo)?.individuoId" class="text-sm">Referência de membro na avaliação atual: {{ detalhe.avaliacaoAtual.respostas.find(i => i.codigo === codigo)?.individuoId }}.</p>
          <div class="flex gap-6"><label class="min-h-11 flex items-center gap-2"><input v-model="respostas[codigo]" type="radio" :name="codigo" :value="true">Sim, após revisão</label><label class="min-h-11 flex items-center gap-2"><input v-model="respostas[codigo]" type="radio" :name="codigo" :value="false">Não, após revisão</label></div>
        </fieldset>
        <label class="flex min-h-11 items-center gap-2"><input v-model="confirmado" type="checkbox" :disabled="!!pendente">Revisei todos os indicadores e confirmo registrar uma nova avaliação com a base atual exibida.</label>
        <p v-if="detalhe.familia.status !== 'ATIVA'" role="alert">Família inativa: registro de avaliação indisponível.</p>
        <UButton v-if="!recibo" type="submit" :loading="ocupado" :disabled="!completo || !confirmado || detalhe.familia.status !== 'ATIVA'">{{ pendente ? 'Tentar confirmar novamente' : 'Confirmar nova avaliação' }}</UButton>
        <p v-if="recibo" role="status">Nova operação {{ recibo.operacaoId }}: {{ recibo.status === 'CONFIRMADA' ? 'confirmada pelo servidor' : 'novo conflito; os dados mudaram novamente' }}.</p>
        <UButton v-if="recibo" color="neutral" @click="pendente = null; consultar()">Voltar aos conflitos preservados</UButton>
      </form>
    </template>
  </section>
</template>
