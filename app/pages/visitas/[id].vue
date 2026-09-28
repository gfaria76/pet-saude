<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { FAMILIAS_SINTETICAS } from '~/composables/useFamilias'
import { IndicadorRiscoCodigo, METADADOS_INDICADORES, CONFIGURACAO_COELHO_SAVASSI_V1 } from '~~/shared/domain/risk-engine'
const route = useRoute()
const familia = FAMILIAS_SINTETICAS.find(item => item.id === route.params.id && item.municipioId === 'coxim')
const { registros, salvar, atualizar, erro, ocupado } = useCampoOffline()
const respostas = ref<Partial<Record<IndicadorRiscoCodigo, boolean>>>({})
const codigos = Object.values(IndicadorRiscoCodigo)
const operacaoId = ref('')
const mensagem = ref('')
const carregado = ref(false)
const alterado = ref(false)
const submetido = ref(false)
const completos = computed(() => codigos.every(codigo => typeof respostas.value[codigo] === 'boolean'))
onMounted(async () => {
  await atualizar()
  const anterior = registros.value.filter(item => item.operacao.familiaId === familia?.id && item.estado === 'rascunho').sort((a, b) => b.ordem - a.ordem)[0]
  const aguardando = registros.value.find(item => item.operacao.familiaId === familia?.id && item.estado !== 'rascunho' && item.estado !== 'confirmado')
  if (aguardando) { submetido.value = true; mensagem.value = 'Já há uma coleta desta família aguardando envio ou revisão. Consulte a sincronização antes de iniciar outra.' }
  operacaoId.value = anterior?.operacao.operacaoId ?? crypto.randomUUID()
  if (anterior) { respostas.value = Object.fromEntries(anterior.operacao.indicadores.map(item => [item.codigo, item.ativo])); mensagem.value = 'Rascunho recuperado deste aparelho.' }
  carregado.value = true
  window.addEventListener('beforeunload', protegerSaida)
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', protegerSaida))
function protegerSaida(event: BeforeUnloadEvent) { if (alterado.value) { event.preventDefault(); event.returnValue = '' } }
onBeforeRouteLeave(() => !alterado.value || window.confirm('Há respostas ainda não salvas. Sair e perder essas alterações?'))
function responder(codigo: IndicadorRiscoCodigo, valor: boolean) { respostas.value[codigo] = valor; alterado.value = true; mensagem.value = '' }
async function guardar(estado: 'rascunho' | 'pendente') {
  if (!familia || !operacaoId.value || submetido.value || (estado === 'pendente' && !completos.value)) return
  const ok = await salvar({ operacaoId: operacaoId.value, tenantId: 'coxim', familiaId: familia.id, versaoCadastroBase: 0, avaliacaoAnteriorId: null,
    versaoEscala: CONFIGURACAO_COELHO_SAVASSI_V1.versao, coletadoEm: new Date().toISOString(),
    indicadores: codigos.filter(codigo => typeof respostas.value[codigo] === 'boolean').map(codigo => ({ codigo, ativo: respostas.value[codigo]! })) }, estado)
  if (ok) { alterado.value = false; submetido.value = estado === 'pendente'; mensagem.value = estado === 'rascunho' ? 'Rascunho salvo neste aparelho.' : 'Salvo neste aparelho — aguardando envio. Esta demonstração não envia ao servidor.' }
}
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-5 p-4 pb-28">
    <UButton to="/visitas" variant="link">Voltar às visitas</UButton>
    <h1 class="text-2xl font-bold">Coleta de campo fictícia</h1>
    <UAlert title="Somente demonstração" description="Respostas fictícias, sem envio ao servidor. A coleta não produz diagnóstico ou classificação automática. Informação não respondida permanece ausente." color="neutral" variant="outline" />
    <template v-if="familia">
      <h2 class="text-lg font-semibold">{{ familia.responsavelNome }}</h2>
      <p role="status">{{ Object.keys(respostas).length }} de {{ codigos.length }} indicadores respondidos</p>
      <UAlert v-if="erro" :title="erro" color="error" />
      <p v-if="mensagem" role="status" class="font-semibold">{{ mensagem }}</p>
      <form v-if="carregado && !submetido" class="space-y-4" @submit.prevent="guardar('pendente')">
        <fieldset v-for="codigo in codigos" :key="codigo" class="rounded-lg border border-default p-4">
          <legend class="px-1 font-medium">{{ METADADOS_INDICADORES[codigo].descricao }}</legend>
          <div class="flex gap-6 py-2">
            <label class="flex min-h-11 items-center gap-2"><input type="radio" class="size-5 scroll-my-40" :name="codigo" :checked="respostas[codigo] === true" @change="responder(codigo, true)"> Sim</label>
            <label class="flex min-h-11 items-center gap-2"><input type="radio" class="size-5 scroll-my-40" :name="codigo" :checked="respostas[codigo] === false" @change="responder(codigo, false)"> Não</label>
          </div>
          <p v-if="respostas[codigo] === undefined" class="text-sm text-muted">Não informado</p>
        </fieldset>
        <div class="sticky bottom-16 flex flex-wrap gap-3 rounded-lg border border-default bg-default p-3">
          <UButton type="button" variant="outline" :loading="ocupado" @click="guardar('rascunho')">Salvar rascunho</UButton>
          <UButton type="submit" :disabled="!completos || ocupado">Concluir coleta local</UButton>
        </div>
      </form>
      <UButton v-if="submetido" to="/sincronizacao">Ver situação do envio</UButton>
    </template>
    <UAlert v-else title="Família indisponível para esta demonstração de campo" description="Selecione uma família fictícia de Coxim na lista de visitas." color="neutral" variant="outline" />
  </main>
</template>
