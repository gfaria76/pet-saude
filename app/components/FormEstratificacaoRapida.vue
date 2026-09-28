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
import BadgeRiscoFamiliar from '~/components/BadgeRiscoFamiliar.vue'

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
  <div class="bg-default rounded-2xl border border-default shadow-xl overflow-hidden">
    <!-- Identificação e prévia -->
    <div class="bg-default text-default p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <p class="text-xs text-muted">
          Nova avaliação<span v-if="prontuario"> · Prontuário {{ prontuario }}</span>
        </p>
        <h2 class="text-xl font-bold mt-1 text-default">{{ nomeFamilia }}</h2>
        <p class="text-xs text-dimmed mt-0.5">Escala: {{ escala.versao }}</p>
      </div>

      <div class="bg-elevated border border-default rounded-xl p-3.5 flex items-center gap-4 shrink-0" aria-live="polite">
        <p>
          <span class="text-[11px] uppercase tracking-wider text-dimmed font-semibold block">Prévia</span>
          <span class="text-2xl font-black text-default">{{ calculoPreview.pontuacaoTotal }}</span>
          <span class="text-xs text-dimmed"> pontos</span>
        </p>
        <BadgeRiscoFamiliar :classificacao="calculoPreview.classificacao" :interativo="false" />
      </div>
    </div>

    <form class="p-5 md:p-8 space-y-7" @submit.prevent="emit('salvar', calculoPreview)">
      <fieldset v-for="grupo in gruposIndicadores" :key="grupo.titulo" class="space-y-3">
        <legend class="text-sm font-bold text-default uppercase tracking-wider border-b border-default pb-1.5 w-full">
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
                ? 'bg-primary/10 border-blue-400 ring-1 ring-blue-500'
                : 'bg-muted border-default hover:bg-elevated'
            ]"
          >
            <input
              type="checkbox"
              class="sr-only"
              :checked="marcados.has(codigo)"
              @change="alternarIndicador(codigo)"
            />
            <Icon :name="ICONES_INDICADOR[codigo]" class="w-7 h-7 text-toned shrink-0" aria-hidden="true" />
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-semibold text-highlighted leading-snug">
                {{ METADADOS_INDICADORES[codigo].descricao }}
              </span>
              <span class="text-xs font-bold text-blue-800">{{ rotuloPeso(codigo) }}</span>
            </span>
            <span
              :class="[
                'w-6 h-6 rounded-md border flex items-center justify-center shrink-0',
                marcados.has(codigo) ? 'bg-primary border-primary text-inverted' : 'bg-default border-slate-400 text-transparent'
              ]"
              aria-hidden="true"
            >
              <Icon :name="ICONES.marcado" class="w-4 h-4" />
            </span>
          </label>
        </div>
      </fieldset>

      <!-- Regra aplicada antes de salvar com UAlert -->
      <UAlert
        :icon="ICONES.regraDecisao"
        color="neutral"
        variant="subtle"
        :title="calculoPreview.regraDecisao"
        :ui="{
          root: 'rounded-xl border border-default bg-muted text-default text-xs font-medium',
          title: 'text-xs font-medium text-default'
        }"
      />

      <div class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-default">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          label="Cancelar"
          class="font-semibold"
          @click="emit('cancelar')"
        />
        <UButton
          type="submit"
          color="primary"
          size="lg"
          :icon="ICONES.salvar"
          label="Salvar avaliação"
          class="font-bold shadow-md"
        />
      </div>
    </form>
  </div>
</template>
