<script setup lang="ts">
import { computed } from 'vue'
import type { FaixaRisco } from '~~/shared/domain/risk-engine'
import { estiloFaixa } from '~/utils/estiloFaixaRisco'

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

const estilo = computed(() => estiloFaixa(props.classificacao))

const tamanhoBadge = computed(() => {
  switch (props.tamanho) {
    case 'sm':
      return 'sm'
    case 'lg':
      return 'lg'
    case 'md':
    default:
      return 'md'
  }
})

const descricaoAcessivel = computed(() => {
  const pontos = props.pontuacao !== undefined ? `, ${props.pontuacao} pontos` : ''
  const acao = props.interativo ? '. Abrir explicação detalhada' : ''
  return `${estilo.value.rotulo} (${estilo.value.sigla})${pontos}${acao}`
})
</script>

<template>
  <!-- Componente UBadge do Nuxt UI v4 com customização estrita de acessibilidade clínica via :ui -->
  <UBadge
    :type="interativo ? 'button' : undefined"
    color="neutral"
    :as="interativo ? 'button' : 'span'"
    :size="tamanhoBadge"
    variant="subtle"
    :aria-label="descricaoAcessivel"
    :title="`${estilo.rotulo} — ${estilo.acaoRecomendada}`"
    :class="[
      'rounded-full border font-bold transition-all shadow-xs gap-1.5 select-none',
      estilo.suave,
      interativo ? 'cursor-pointer hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 min-h-[44px] md:min-h-0' : 'cursor-default'
    ]"
    :ui="{
      base: 'inline-flex items-center tracking-tight ring-0'
    }"
    @click="interativo && emit('click')"
  >
    <!-- Cor + Ícone + Texto: Regra fundamental de acessibilidade clínica (WCAG 2.1 AA) -->
    <Icon :name="estilo.icone" class="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" aria-hidden="true" />
    <span>{{ estilo.sigla }} — {{ estilo.rotulo }}</span>
    <span
      v-if="pontuacao !== undefined"
      :class="['ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-black', estilo.solido]"
      aria-hidden="true"
    >
      {{ pontuacao }} pts
    </span>
  </UBadge>
</template>
