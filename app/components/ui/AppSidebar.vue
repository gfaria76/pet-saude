<script setup lang="ts">
import { ICONES } from '~/utils/icones'
import { AVALIADOR_DEMO } from '~/composables/useFamilias'
defineProps<{ recolhida: boolean }>()
const route = useRoute()
const itens = [
  { rotulo: 'Visão geral', caminho: '/', icone: ICONES.app },
  { rotulo: 'Visitas', caminho: '/visitas', icone: ICONES.calendario },
  { rotulo: 'Sincronização', caminho: '/sincronizacao', icone: ICONES.sincronizar },
  { rotulo: 'Famílias', caminho: '/familias', icone: ICONES.familia },
  { rotulo: 'Território', caminho: '/territorio', icone: ICONES.ubs },
  { rotulo: 'Auditoria', caminho: '/auditoria', icone: ICONES.lgpd }
]
function ativo(caminho: string) {
  return caminho === '/' ? route.path === '/' : route.path.startsWith(caminho)
}
</script>

<template>
  <aside id="menu-gestao" :class="['hidden lg:flex sticky top-0 h-dvh shrink-0 flex-col border-r border-default bg-default', recolhida ? 'w-20' : 'w-64']" aria-label="Menu principal">
    <NuxtLink to="/" class="flex h-20 shrink-0 items-center gap-3 border-b border-default px-5" aria-label="PET-Saúde — início">
      <Icon :name="ICONES.app" class="size-9 shrink-0 text-primary" aria-hidden="true" />
      <span v-if="!recolhida"><strong class="block text-lg text-highlighted">PET-Saúde</strong><span class="text-xs text-muted">Atenção Primária · UFMS</span></span>
    </NuxtLink>
    <nav class="flex-1 space-y-2 overflow-y-auto p-3" aria-label="Gestão">
      <NuxtLink v-for="item in itens" :key="item.caminho" :to="item.caminho" :aria-current="ativo(item.caminho) ? 'page' : undefined" :aria-label="item.rotulo" :title="recolhida ? item.rotulo : undefined" :class="['flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold', ativo(item.caminho) ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-elevated hover:text-default']">
        <Icon :name="item.icone" class="size-5 shrink-0" aria-hidden="true" />
        <span v-if="!recolhida">{{ item.rotulo }}</span>
      </NuxtLink>
    </nav>
    <div v-if="!recolhida" class="space-y-2 border-t border-default p-5 text-sm">
      <p class="font-semibold text-default">{{ AVALIADOR_DEMO.nome }}</p>
      <p class="text-muted">ACS · perfil demonstrativo</p>
      <UButton to="/login" color="neutral" variant="outline" class="min-h-11 w-full justify-center">Acesso institucional</UButton>
      <p class="text-xs text-muted">Dados sintéticos. Acesso institucional em preparação.</p>
    </div>
  </aside>
</template>
