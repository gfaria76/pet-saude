<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ICONES } from '~/utils/icones'

const route = useRoute()

interface ItemNavegacao {
  rotulo: string
  caminho: string
  icone: string
  descricao: string
}

const itens: ItemNavegacao[] = [
  { rotulo: 'Visitas', caminho: '/visitas', icone: ICONES.calendario, descricao: 'Preparar e retomar visitas' },
  { rotulo: 'Famílias', caminho: '/familias', icone: ICONES.familia, descricao: 'Famílias demonstrativas' },
  { rotulo: 'Sincronização', caminho: '/sincronizacao', icone: ICONES.sincronizar, descricao: 'Pendências deste aparelho' },
  { rotulo: 'Mais', caminho: '/mais', icone: ICONES.menu, descricao: 'Gestão e acesso institucional' }
]

function estaAtivo(caminho: string): boolean {
  if (caminho === '/') return route.path === '/'
  return route.path.startsWith(caminho)
}
</script>

<template>
  <!-- Barra de Navegação Mobile (Zona do Polegar / Bottom Bar) -->
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-default border-t border-default shadow-lg safe-bottom"
    aria-label="Navegação móvel inferior"
  >
    <div class="grid grid-cols-4 h-14">
      <NuxtLink
        v-for="item in itens"
        :key="item.caminho"
        :to="item.caminho"
        :aria-current="estaAtivo(item.caminho) ? 'page' : undefined"
        :class="[
          'flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors',
          estaAtivo(item.caminho)
            ? 'text-primary font-bold bg-primary/10'
            : 'text-muted hover:text-highlighted'
        ]"
      >
        <Icon :name="item.icone" class="w-5 h-5 shrink-0" aria-hidden="true" />
        <span class="truncate px-1">{{ item.rotulo }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
