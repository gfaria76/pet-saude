<script setup lang="ts">
import { ICONES } from '~/utils/icones'
</script>

<template>
  <div class="min-h-dvh bg-muted text-default">
    <header class="flex items-center justify-between gap-3 border-b border-default bg-default p-4 sm:px-8">
      <NuxtLink to="/" class="flex items-center gap-2 font-bold text-highlighted">
        <Icon :name="ICONES.app" class="size-7 text-primary" aria-hidden="true" /> PET-Saúde
      </NuxtLink>
      <UiSeletorTema />
    </header>
    <main class="mx-auto max-w-lg px-4 py-10 sm:py-16"><slot /></main>
  </div>
</template>
