<script setup lang="ts">
import { computed } from 'vue'
import type { FaixaRisco } from '~~/shared/domain/risk-engine'
import { estiloFaixa, FAIXAS_POR_PRIORIDADE } from '~/utils/estiloFaixaRisco'

const props = defineProps<{
  contagemRisco: Record<FaixaRisco, number>
  totalFamilias: number
  filtroAtivo?: FaixaRisco | 'TODAS'
}>()

const emit = defineEmits<{
  (e: 'selecionarFiltro', faixa: FaixaRisco | 'TODAS'): void
}>()

// Da faixa mais grave para a menos grave (prioridade de visita)
const cards = computed(() =>
  FAIXAS_POR_PRIORIDADE.map(faixa => ({
    faixa,
    estilo: estiloFaixa(faixa),
    quantidade: props.contagemRisco[faixa] ?? 0
  }))
)

const percentual = (quantidade: number) =>
  props.totalFamilias > 0 ? Math.round((quantidade / props.totalFamilias) * 100) : 0
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
    <button
      v-for="card in cards"
      :key="card.faixa"
      type="button"
      :aria-pressed="filtroAtivo === card.faixa"
      :class="[
        'p-4 md:p-5 rounded-2xl border border-l-4 bg-white shadow-sm text-left cursor-pointer hover:shadow-md transition-shadow',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700',
        card.estilo.borda,
        filtroAtivo === card.faixa ? 'ring-2 ring-blue-700' : ''
      ]"
      @click="emit('selecionarFiltro', filtroAtivo === card.faixa ? 'TODAS' : card.faixa)"
    >
      <span class="flex items-center justify-between gap-2">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-600">
          {{ card.estilo.rotulo }} ({{ card.estilo.sigla }})
        </span>
        <Icon :name="card.estilo.icone" :class="['w-6 h-6 shrink-0', card.estilo.texto]" aria-hidden="true" />
      </span>

      <span class="mt-2 flex items-baseline justify-between gap-2">
        <span :class="['text-3xl font-black tracking-tight', card.estilo.texto]">{{ card.quantidade }}</span>
        <span class="text-xs font-semibold text-slate-600">{{ percentual(card.quantidade) }}% do total</span>
      </span>

      <span class="block text-[11px] text-slate-600 mt-2 font-medium">{{ card.estilo.acaoRecomendada }}</span>
    </button>
  </div>
</template>
