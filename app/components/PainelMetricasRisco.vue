<script setup lang="ts">
import { computed } from 'vue'
import { FaixaRisco, ROTULOS_FAIXA_RISCO } from '~~/shared/domain/risk-engine'

const props = defineProps<{
  contagemRisco: Record<FaixaRisco, number>
  totalFamilias: number
  filtroAtivo?: FaixaRisco | 'TODAS'
}>()

const emit = defineEmits<{
  (e: 'selecionarFiltro', faixa: FaixaRisco | 'TODAS'): void
}>()

const cards = computed(() => [
  {
    faixa: FaixaRisco.RISCO_MAIOR_R3,
    rotulo: 'Risco Máximo (R3)',
    quantidade: props.contagemRisco[FaixaRisco.RISCO_MAIOR_R3] || 0,
    corBorda: 'border-l-red-600',
    bg: 'bg-red-50/50',
    textColor: 'text-red-900',
    icon: 'lucide:octagon-alert',
    prioridade: 'Prioridade Absoluta'
  },
  {
    faixa: FaixaRisco.RISCO_MEDIO_R2,
    rotulo: 'Risco Médio (R2)',
    quantidade: props.contagemRisco[FaixaRisco.RISCO_MEDIO_R2] || 0,
    corBorda: 'border-l-orange-500',
    bg: 'bg-orange-50/50',
    textColor: 'text-orange-950',
    icon: 'lucide:triangle-alert',
    prioridade: 'Acompanhamento Prioritário'
  },
  {
    faixa: FaixaRisco.RISCO_MENOR_R1,
    rotulo: 'Risco Menor (R1)',
    quantidade: props.contagemRisco[FaixaRisco.RISCO_MENOR_R1] || 0,
    corBorda: 'border-l-amber-500',
    bg: 'bg-amber-50/50',
    textColor: 'text-amber-900',
    icon: 'lucide:info',
    prioridade: 'Monitoramento de Rotina'
  },
  {
    faixa: FaixaRisco.SEM_RISCO_R0,
    rotulo: 'Sem Risco (R0)',
    quantidade: props.contagemRisco[FaixaRisco.SEM_RISCO_R0] || 0,
    corBorda: 'border-l-emerald-600',
    bg: 'bg-emerald-50/50',
    textColor: 'text-emerald-900',
    icon: 'lucide:check-circle-2',
    prioridade: 'Ações Básicas de Saúde'
  }
])
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div
      v-for="card in cards"
      :key="card.faixa"
      :class="[
        'p-5 rounded-2xl border-l-4 border bg-white shadow-sm transition-all cursor-pointer select-none hover:shadow-md',
        card.corBorda,
        filtroAtivo === card.faixa ? 'ring-2 ring-blue-600 shadow-md bg-blue-50/20' : ''
      ]"
      @click="emit('selecionarFiltro', filtroAtivo === card.faixa ? 'TODAS' : card.faixa)"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">
          {{ card.rotulo }}
        </span>
        <Icon :name="card.icon" class="w-4 h-4 text-slate-400" />
      </div>

      <div class="mt-2 flex items-baseline justify-between">
        <span :class="['text-3xl font-black tracking-tight', card.textColor]">
          {{ card.quantidade }}
        </span>
        <span class="text-xs font-semibold text-slate-400">
          {{ totalFamilias > 0 ? Math.round((card.quantidade / totalFamilias) * 100) : 0 }}% do total
        </span>
      </div>

      <p class="text-[11px] text-slate-500 mt-2 font-medium">
        {{ card.prioridade }}
      </p>
    </div>
  </div>
</template>
