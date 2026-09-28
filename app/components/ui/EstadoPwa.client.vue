<script setup lang="ts">
const { $pwa } = useNuxtApp()
</script>
<template>
  <div v-if="$pwa?.needRefresh" role="status" class="border-b border-default bg-default p-3 text-sm text-default">
    Nova versão disponível. Salve sua coleta antes de fechar todas as abas e abrir o aplicativo novamente.
  </div>
  <UButton v-else-if="$pwa?.showInstallPrompt" color="neutral" variant="outline" class="m-3 min-h-11" @click="$pwa.install()">Instalar no aparelho</UButton>
</template>
