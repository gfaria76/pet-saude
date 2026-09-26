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

const descricaoAcessivel = computed(() => {
  const pontos = props.pontuacao !== undefined ? `, ${props.pontuacao} pontos` : ''
  const acao = props.interativo ? '. Abrir explicação detalhada' : ''
  return `${estilo.value.rotulo} (${estilo.value.sigla})${pontos}${acao}`
})
</script>

<template>
  <component
    :is="interativo ? 'button' : 'span'"
    :type="interativo ? 'button' : undefined"
    :class="[
      'inline-flex items-center rounded-full border shadow-sm font-medium',
      tamanhoClasses,
      estilo.suave,
      interativo
        ? 'cursor-pointer hover:shadow transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-700 min-h-[44px] md:min-h-0'
        : 'cursor-default'
    ]"
    :aria-label="descricaoAcessivel"
    :title="`${estilo.rotulo} — ${estilo.acaoRecomendada}`"
    @click="interativo && emit('click')"
  >
    <!-- Cor + ícone + texto: nunca depender só da cor -->
    <Icon :name="estilo.icone" class="w-4 h-4 md:w-5 md:h-5 shrink-0" aria-hidden="true" />
    <span class="tracking-tight">{{ estilo.sigla }} — {{ estilo.rotulo }}</span>
    <span
      v-if="pontuacao !== undefined"
      :class="['ml-0.5 px-1.5 rounded-full text-xs font-bold', estilo.solido]"
      aria-hidden="true"
    >
      {{ pontuacao }} pts
    </span>
  </component>
</template>
