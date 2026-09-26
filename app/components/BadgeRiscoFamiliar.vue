<script setup lang="ts">
import { computed } from 'vue'
import { FaixaRisco, ROTULOS_FAIXA_RISCO } from '~~/shared/domain/risk-engine'

const props = withDefaults(
  defineProps<{
    classificacao: FaixaRisco
    pontuacao?: number
    interativo?: boolean
    tamanho?: 'sm' | 'md' | 'lg'
  }>(),
  {
    pontuacao: undefined,
    interativo: true,
    tamanho: 'md'
  }
)

const emit = defineEmits<{
  (e: 'click'): void
}>()

const infoFaixa = computed(() => ROTULOS_FAIXA_RISCO[props.classificacao] || {
  rotulo: 'Não avaliado',
  sigla: 'N/A',
  acaoRecomendada: ''
})

const estiloConfig = computed(() => {
  switch (props.classificacao) {
    case FaixaRisco.SEM_RISCO_R0:
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
        badge: 'bg-emerald-700 text-white',
        icon: 'lucide:check-circle-2'
      }
    case FaixaRisco.RISCO_MENOR_R1:
      return {
        bg: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100',
        badge: 'bg-amber-600 text-white',
        icon: 'lucide:info'
      }
    case FaixaRisco.RISCO_MEDIO_R2:
      return {
        bg: 'bg-orange-50 text-orange-950 border-orange-200 hover:bg-orange-100',
        badge: 'bg-orange-600 text-white',
        icon: 'lucide:triangle-alert'
      }
    case FaixaRisco.RISCO_MAIOR_R3:
      return {
        bg: 'bg-red-50 text-red-950 border-red-300 hover:bg-red-100 font-semibold',
        badge: 'bg-red-700 text-white',
        icon: 'lucide:octagon-alert'
      }
    default:
      return {
        bg: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        badge: 'bg-gray-500 text-white',
        icon: 'lucide:info'
      }
  }
})

const tamanhoClasses = computed(() => {
  switch (props.tamanho) {
    case 'sm':
      return 'text-xs px-2 py-0.5 gap-1'
    case 'lg':
      return 'text-sm px-3.5 py-1.5 gap-2'
    case 'md':
    default:
      return 'text-xs md:text-sm px-2.5 py-1 gap-1.5'
  }
})
</script>

<template>
  <button
    type="button"
    :disabled="!interativo"
    :class="[
      'inline-flex items-center rounded-full border transition-all shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600',
      tamanhoClasses,
      estiloConfig.bg,
      interativo ? 'cursor-pointer hover:shadow' : 'cursor-default'
    ]"
    :title="`${infoFaixa.rotulo} - ${infoFaixa.acaoRecomendada}. Clique para ver explicação detalhada.`"
    @click="interativo && emit('click')"
  >
    <!-- Ícone semântico via @nuxt/icon oficial (acessibilidade para daltônicos) -->
    <Icon
      :name="estiloConfig.icon"
      class="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"
      aria-hidden="true"
    />

    <!-- Rótulo textual obrigatório (nunca depender apenas de cor) -->
    <span class="tracking-tight">{{ infoFaixa.sigla }} — {{ infoFaixa.rotulo }}</span>

    <!-- Pontuação consolidada quando fornecida -->
    <span
      v-if="pontuacao !== undefined"
      :class="['ml-0.5 px-1.5 py-0.2 rounded-full text-xs font-bold', estiloConfig.badge]"
    >
      {{ pontuacao }} pts
    </span>
  </button>
</template>
