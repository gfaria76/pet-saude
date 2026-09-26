<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  calcularEstratificacaoRisco,
  CONFIGURACAO_COELHO_SAVASSI_V1,
  IndicadorRiscoCodigo,
  METADADOS_INDICADORES,
  type AvaliacaoAnteriorEntrada,
  type ConfiguracaoEscalaRisco,
  type ContextoAvaliacao,
  type ResultadoEstratificacaoRisco
} from '~~/shared/domain/risk-engine'
import { ICONES } from '~/utils/icones'
import { ICONES_INDICADOR } from '~/utils/iconesIndicador'

const props = withDefaults(
  defineProps<{
    familiaId: string
    nomeFamilia: string
    prontuario?: string
    avaliacaoAnterior?: AvaliacaoAnteriorEntrada
    contexto: ContextoAvaliacao
    escala?: ConfiguracaoEscalaRisco
  }>(),
  {
    prontuario: undefined,
    avaliacaoAnterior: undefined,
    escala: () => CONFIGURACAO_COELHO_SAVASSI_V1
  }
)

const emit = defineEmits<{
  (e: 'salvar', resultado: ResultadoEstratificacaoRisco): void
  (e: 'cancelar'): void
}>()

// Todos começam desmarcados ("Ausente"), com salvamento explícito.
const marcados = ref<Set<IndicadorRiscoCodigo>>(new Set())

// Grupos por afinidade (ui_guidelines §1) — organização visual, sem efeito no cálculo.
const gruposIndicadores: Array<{ titulo: string; codigos: IndicadorRiscoCodigo[] }> = [
  {
    titulo: 'Domicílio e saneamento',
    codigos: [IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO, IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO]
  },
  {
    titulo: 'Condições sociais',
    codigos: [IndicadorRiscoCodigo.IND_DESEMPREGO, IndicadorRiscoCodigo.IND_DROGADICAO, IndicadorRiscoCodigo.IND_ANALFABETISMO]
  },
  {
    titulo: 'Saúde e limitações físicas',
    codigos: [
      IndicadorRiscoCodigo.IND_ACAMADO,
      IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA,
      IndicadorRiscoCodigo.IND_DEFICIENCIA_MENTAL,
      IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE,
      IndicadorRiscoCodigo.IND_HIPERTENSAO,
      IndicadorRiscoCodigo.IND_DIABETES
    ]
  },
  {
    titulo: 'Faixas etárias de risco',
    codigos: [IndicadorRiscoCodigo.IND_MENOR_6_MESES, IndicadorRiscoCodigo.IND_MAIOR_70_ANOS]
  }
]

const rotuloPeso = (codigo: IndicadorRiscoCodigo) => {
  const peso = props.escala.pesos[codigo]
  return peso === null ? 'Não pontuado' : `+${peso} pts`
}

// Prévia em tempo real pelo motor puro de domínio (nenhuma regra aqui)
const calculoPreview = computed(() =>
  calcularEstratificacaoRisco(
    {
      familiaId: props.familiaId,
      indicadores: Object.values(IndicadorRiscoCodigo).map(codigo => ({ codigo, ativo: marcados.value.has(codigo) })),
      avaliacaoAnterior: props.avaliacaoAnterior
    },
    props.contexto,
    props.escala
  )
)

function alternarIndicador(codigo: IndicadorRiscoCodigo) {
  const proximo = new Set(marcados.value)
  if (proximo.has(codigo)) proximo.delete(codigo)
  else proximo.add(codigo)
  marcados.value = proximo
}
</script>

<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
    <!-- Identificação e prévia -->
    <div class="bg-slate-900 text-white p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <p class="text-xs text-slate-300">
          Nova avaliação<span v-if="prontuario"> · Prontuário {{ prontuario }}</span>
        </p>
        <h2 class="text-xl font-bold mt-1">{{ nomeFamilia }}</h2>
        <p class="text-xs text-slate-400 mt-0.5">Escala: {{ escala.versao }}</p>
      </div>

      <div class="bg-slate-800 border border-slate-700 rounded-xl p-3.5 flex items-center gap-4 shrink-0" aria-live="polite">
        <p>
          <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Prévia</span>
          <span class="text-2xl font-black">{{ calculoPreview.pontuacaoTotal }}</span>
          <span class="text-xs text-slate-400"> pontos</span>
        </p>
        <BadgeRiscoFamiliar :classificacao="calculoPreview.classificacao" :interativo="false" />
      </div>
    </div>

    <form class="p-5 md:p-8 space-y-7" @submit.prevent="emit('salvar', calculoPreview)">
      <fieldset v-for="grupo in gruposIndicadores" :key="grupo.titulo" class="space-y-3">
        <legend class="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5 w-full">
          {{ grupo.titulo }}
        </legend>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label
            v-for="codigo in grupo.codigos"
            :key="codigo"
            :class="[
              'p-3.5 min-h-[56px] rounded-xl border cursor-pointer select-none flex items-center gap-3 transition-colors',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-700',
              marcados.has(codigo)
                ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-500'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            ]"
          >
            <input
              type="checkbox"
              class="sr-only"
              :checked="marcados.has(codigo)"
              @change="alternarIndicador(codigo)"
            >
            <Icon :name="ICONES_INDICADOR[codigo]" class="w-7 h-7 text-slate-700 shrink-0" aria-hidden="true" />
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-semibold text-slate-900 leading-snug">
                {{ METADADOS_INDICADORES[codigo].descricao }}
              </span>
              <span class="text-xs font-bold text-blue-800">{{ rotuloPeso(codigo) }}</span>
            </span>
            <span
              :class="[
                'w-6 h-6 rounded-md border flex items-center justify-center shrink-0',
                marcados.has(codigo) ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-slate-400 text-transparent'
              ]"
              aria-hidden="true"
            >
              <Icon :name="ICONES.marcado" class="w-4 h-4" />
            </span>
          </label>
        </div>
      </fieldset>

      <!-- Regra aplicada antes de salvar -->
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium flex gap-2">
        <Icon :name="ICONES.regraDecisao" class="w-4 h-4 text-slate-500 shrink-0 mt-px" aria-hidden="true" />
        <span>{{ calculoPreview.regraDecisao }}</span>
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          class="px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
          @click="emit('cancelar')"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="px-6 py-3 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Icon :name="ICONES.salvar" class="w-4 h-4" aria-hidden="true" />
          <span>Salvar avaliação</span>
        </button>
      </div>
    </form>
  </div>
</template>
