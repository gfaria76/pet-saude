<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useFamilias } from '~/composables/useFamilias'
import AppHeader from '~/components/ui/AppHeader.vue'
import AppSidebar from '~/components/ui/AppSidebar.vue'
import AppMobileHeader from '~/components/ui/AppMobileHeader.vue'
import AppNavigation from '~/components/ui/AppNavigation.vue'
import DrawerExplicativoRisco from '~/components/DrawerExplicativoRisco.vue'
import FormEstratificacaoRapida from '~/components/FormEstratificacaoRapida.vue'

const router = useRouter()
const menuRecolhido = ref(false)

const {
  drawerAberto,
  avaliacaoSelecionada,
  totalAvaliacoesSelecionada,
  familiaSelecionada,
  familiaEmAvaliacao,
  avaliacaoAnteriorParaForm,
  contextoFormulario,
  modalAvaliacaoAberto,
  fecharDrawer,
  fecharModalAvaliacao,
  salvarNovaAvaliacao
} = useFamilias()

function aoReavaliarDoDrawer() {
  if (familiaSelecionada.value) {
    const id = familiaSelecionada.value.id
    fecharDrawer()
    router.push(`/familias/${id}/avaliar`)
  }
}
</script>

<template>
  <div class="min-h-screen bg-elevated text-highlighted flex font-sans antialiased">
    <!-- Barra Lateral (Sidebar) no Desktop / Tablet -->
    <AppSidebar :recolhida="menuRecolhido" />

    <!-- Área de Conteúdo Principal -->
    <div class="flex-1 flex flex-col min-w-0 min-h-screen">
      <!-- Cabeçalho Superior apenas em Telas Pequenas (Mobile) -->
      <AppHeader :recolhida="menuRecolhido" @alternar-menu="menuRecolhido = !menuRecolhido" />
      <AppMobileHeader />

      <!-- Conteúdo da Página -->
      <main class="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 mb-24 lg:mb-0">
        <slot />
      </main>

      <!-- Rodapé Institucional -->
      <footer class="hidden lg:block border-t border-default px-6 py-3 text-xs text-muted">
        PET-Saúde · UFMS · Coxim e Corumbá/MS · Ambiente demonstrativo
      </footer>
    </div>

    <!-- Navegação Mobile Inferior (Thumb-Zone) -->
    <AppNavigation />

    <!-- Componente Gaveta Lateral (Drawer) de Risco Explicável -->
    <DrawerExplicativoRisco
      :aberto="drawerAberto"
      :avaliacao="avaliacaoSelecionada"
      :total-avaliacoes="totalAvaliacoesSelecionada"
      :nome-familia="familiaSelecionada?.responsavelNome"
      :prontuario="familiaSelecionada?.prontuarioFamiliar"
      @fechar="fecharDrawer"
      @reavaliar="aoReavaliarDoDrawer"
    />

    <!-- Modal Auxiliar de Estratificação Rápida -->
    <UModal
      v-model:open="modalAvaliacaoAberto"
      title="Reavaliar família"
      description="Registro de uma nova avaliação de risco familiar."
      :ui="{
        content: 'sm:max-w-4xl p-0 overflow-hidden rounded-2xl bg-default border border-default shadow-2xl'
      }"
    >
      <template #content>
        <div v-if="familiaEmAvaliacao && contextoFormulario" class="max-h-[90vh] overflow-y-auto">
          <FormEstratificacaoRapida
            :familia-id="familiaEmAvaliacao.id"
            :nome-familia="familiaEmAvaliacao.responsavelNome"
            :prontuario="familiaEmAvaliacao.prontuarioFamiliar"
            :avaliacao-anterior="avaliacaoAnteriorParaForm"
            :contexto="contextoFormulario"
            @salvar="salvarNovaAvaliacao"
            @cancelar="fecharModalAvaliacao"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
