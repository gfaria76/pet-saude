<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ICONES } from '~/utils/icones'
import ModoSolForteToggle from '~/components/ui/ModoSolForteToggle.vue'

const router = useRouter()

function voltar() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="min-h-screen bg-elevated text-highlighted flex flex-col font-sans antialiased">
    <!-- Barra Superior de Campo (Compacta e Otimizada para Sol Forte) -->
    <header class="bg-default text-default border-b border-default sticky top-0 z-30 shadow-md">
      <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button
          type="button"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-default hover:bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer text-xs font-bold"
          @click="voltar"
        >
          <Icon :name="ICONES.setaVoltar" class="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Voltar</span>
        </button>

        <div class="flex items-center gap-1.5 text-center">
          <span class="text-xs font-extrabold text-primary uppercase tracking-wider">
            Trabalho em campo
          </span>
        </div>

        <div class="flex items-center gap-2">
          <UiSeletorTema />
          <ModoSolForteToggle />
        </div>
      </div>
    </header>

    <!-- Conteúdo em tela cheia -->
    <main class="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 pb-24 safe-bottom">
      <slot />
    </main>
    <UiAppNavigation />
  </div>
</template>
