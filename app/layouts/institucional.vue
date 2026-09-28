<script setup lang="ts">
import { ICONES } from '~/utils/icones'
</script>
<template>
  <div class="min-h-dvh bg-muted text-default">
    <header class="border-b border-default bg-default p-4 sm:px-8">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <NuxtLink to="/operacional" class="flex min-h-11 items-center gap-2 font-bold text-highlighted">
          <Icon :name="ICONES.app" class="size-7 text-primary" aria-hidden="true" /> PET-Saúde
        </NuxtLink>
        <nav class="flex items-center gap-3" aria-label="Conta e preferências">
          <UButton to="/login" color="neutral" variant="outline" class="min-h-11">Conta e município</UButton>
          <UiSeletorTema />
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-6 sm:py-10"><slot /></main>
  </div>
</template>
