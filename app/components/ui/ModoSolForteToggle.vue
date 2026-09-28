<script setup lang="ts">
import { ICONES } from '~/utils/icones'
const { modoSolForte, alternarModoSolForte } = useModoSolForte()
</script>

<template>
  <UButton
    :icon="ICONES.solForte"
    :aria-pressed="modoSolForte"
    :variant="modoSolForte ? 'solid' : 'outline'"
    color="neutral"
    aria-label="Modo sol forte"
    title="Modo sol forte: leitura com alto contraste"
    class="min-h-11 min-w-11 justify-center"
    @click="alternarModoSolForte"
  ><span class="hidden sm:inline">Sol forte</span></UButton>
</template>
