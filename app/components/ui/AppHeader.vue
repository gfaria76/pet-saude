<script setup lang="ts">
import { ICONES } from '~/utils/icones'
const { filtroMunicipio } = useFamilias()
defineProps<{ recolhida: boolean }>()
defineEmits<{ alternarMenu: [] }>()
const opcoes = [
  { label: 'Todos os municípios', value: 'todos' },
  { label: 'Coxim', value: 'coxim' },
  { label: 'Corumbá', value: 'corumba' }
]
</script>

<template>
  <header class="hidden lg:flex sticky top-0 z-20 h-20 items-center justify-between gap-4 border-b border-default bg-default px-6">
    <div class="flex items-center gap-4">
      <UButton :icon="ICONES.menu" color="neutral" variant="ghost" class="min-h-11 min-w-11 justify-center" :aria-expanded="!recolhida" aria-controls="menu-gestao" aria-label="Recolher ou expandir menu" @click="$emit('alternarMenu')" />
      <div>
        <p class="text-sm font-semibold text-highlighted">Gestão do cuidado</p>
        <p class="text-xs text-muted">Demonstração · dados fictícios</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <USelect v-model="filtroMunicipio" :items="opcoes" :icon="ICONES.municipio" aria-label="Filtrar município demonstrativo" class="w-52 min-h-11" />
      <UiSeletorTema />
      <UiModoSolForteToggle />
    </div>
  </header>
</template>
