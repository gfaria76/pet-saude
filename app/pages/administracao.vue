<script setup lang="ts">
useHead({ title: 'Vínculos institucionais | PET-Saúde' })
</script>
<template>
  <main class="mx-auto max-w-2xl p-4 sm:p-8">
    <ClientOnly><GestaoVinculos /><template #fallback><p role="status">Verificando acesso…</p></template></ClientOnly>
  </main>
</template>
