<script setup lang="ts">
definePageMeta({ layout: 'acesso' })
useHead({ title: 'Acesso institucional · PET-Saúde' })
</script>

<template>
  <ClientOnly>
    <AcessoInstitucional />
    <template #fallback><p role="status" class="text-muted">Carregando acesso institucional…</p></template>
  </ClientOnly>
</template>
