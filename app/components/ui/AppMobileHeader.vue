<script setup lang="ts">
import { ICONES } from '~/utils/icones'
const { filtroMunicipio } = useFamilias()
const opcoes = [
  { label: 'Todos os municípios', value: 'todos' },
  { label: 'Coxim', value: 'coxim' },
  { label: 'Corumbá', value: 'corumba' }
]
</script>

<template>
  <header class="lg:hidden sticky top-0 z-30 border-b border-default bg-default p-3 space-y-3">
    <div class="flex items-center justify-between gap-2">
      <NuxtLink to="/" class="flex items-center gap-2 font-bold text-highlighted">
        <Icon :name="ICONES.app" class="size-7 text-primary" aria-hidden="true" />PET-Saúde
      </NuxtLink>
      <div class="flex items-center gap-2"><UiSeletorTema /><UiModoSolForteToggle /></div>
    </div>
    <USelect v-model="filtroMunicipio" :items="opcoes" aria-label="Filtrar município demonstrativo" class="w-full min-h-11" />
    <div class="flex items-center justify-between gap-2"><p class="text-xs text-muted">Demonstração · dados fictícios</p><UButton to="/login" color="neutral" variant="link" size="sm" class="min-h-11">Entrar</UButton></div>
  </header>
</template>
