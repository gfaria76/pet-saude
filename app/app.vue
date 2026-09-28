<script setup lang="ts">
import { provideFamilias } from '~/composables/useFamilias'

// Provedor de estado global compartilhado para toda a árvore de páginas e componentes
provideFamilias()
</script>

<template>
  <UApp>
    <VitePwaManifest />
    <UiEstadoPwa />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
