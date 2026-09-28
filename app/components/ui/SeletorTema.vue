<script setup lang="ts">
import { ICONES } from '~/utils/icones'
const colorMode = useColorMode()
const { modoSolForte } = useModoSolForte()
const opcoes = [
  { label: 'Sistema', value: 'system' },
  { label: 'Claro', value: 'light' },
  { label: 'Escuro', value: 'dark' }
]
</script>

<template>
  <ClientOnly>
    <USelect
      v-model="colorMode.preference"
      :items="opcoes"
      :icon="ICONES.tema"
      :disabled="modoSolForte"
      aria-label="Tema da interface"
      class="min-h-11 w-32"
    />
    <template #fallback><span class="inline-block h-11 w-32" /></template>
  </ClientOnly>
</template>
