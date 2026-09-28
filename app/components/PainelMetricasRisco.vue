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
    <!-- UCard do Nuxt UI v4 como botão de filtro tátil -->
    <UCard
      v-for="card in cards"
      :key="card.faixa"
      as="button"
      type="button"
      :aria-pressed="filtroAtivo === card.faixa"
      :class="[
        'border-l-4 text-left cursor-pointer transition-all hover:shadow-md select-none',
        card.estilo.borda,
        filtroAtivo === card.faixa ? 'ring-2 ring-blue-700 shadow-sm' : ''
      ]"
      :ui="{
        root: 'rounded-2xl border border-default bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700',
        body: 'p-4 md:p-5 flex flex-col justify-between h-full'
      }"
      @click="emit('selecionarFiltro', filtroAtivo === card.faixa ? 'TODAS' : card.faixa)"
    >
      <div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold uppercase tracking-wider text-muted">
            {{ card.estilo.rotulo }} ({{ card.estilo.sigla }})
          </span>
          <Icon :name="card.estilo.icone" :class="['w-6 h-6 shrink-0', card.estilo.texto]" aria-hidden="true" />
        </div>

        <div class="mt-2.5 flex items-baseline justify-between gap-2">
          <span :class="['text-3xl font-black tracking-tight', card.estilo.texto]">{{ card.quantidade }}</span>
          <span class="text-xs font-semibold text-muted">{{ percentual(card.quantidade) }}% do total</span>
        </div>
      </div>

      <div class="mt-2.5 pt-2 border-t border-default text-[11px] text-muted font-medium">
        {{ card.estilo.acaoRecomendada }}
      </div>
    </UCard>
  </div>
</template>
