<script setup lang="ts">
import { useFamilias } from '~/composables/useFamilias'

const {
  familiasFiltradas,
  contagemRisco,
  filtroMunicipio,
  filtroFaixaRisco,
  termoBusca,
  familiaSelecionada,
  avaliacaoSelecionada,
  drawerAberto,
  familiaEmAvaliacao,
  modalAvaliacaoAberto,
  abrirDrawerExplicativo,
  fecharDrawer,
  iniciarNovaAvaliacao,
  fecharModalAvaliacao,
  salvarNovaAvaliacao
} = useFamilias()
</script>

<template>
  <div class="min-h-screen bg-slate-100/80 text-slate-900 flex flex-col font-sans antialiased">
    <!-- Barra Superior de Navegação do SUS -->
    <header class="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Logo e Nome do Sistema -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
            <Icon name="lucide:shield-alert" class="w-6 h-6 text-white" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-bold tracking-tight text-white">
                PET-Saúde
              </h1>
              <span class="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/30">
                Estratificação Familiar
              </span>
            </div>
            <p class="text-[11px] text-slate-400">
              Atenção Primária à Saúde · Escala Coelho-Savassi (ERF-CS)
            </p>
          </div>
        </div>

        <!-- Seletor Territorial & Selo de Segurança LGPD -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-xs bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl">
            <Icon name="lucide:building-2" class="w-4 h-4 text-blue-400" />
            <select
              v-model="filtroMunicipio"
              class="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="todos" class="bg-slate-900 text-white">Todos os Municípios (Piloto)</option>
              <option value="coxim" class="bg-slate-900 text-white">UBS Coxim (MS)</option>
              <option value="corumba" class="bg-slate-900 text-white">UBS Corumbá (MS)</option>
            </select>
          </div>

          <div class="hidden md:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-xl font-medium">
            <Icon name="lucide:lock" class="w-3.5 h-3.5" />
            <span>LGPD: Dados Sintéticos de Teste</span>
          </div>
        </div>

      </div>
    </header>

    <!-- Conteúdo Principal -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Cabeçalho Informativo & Ações Rápidas -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-slate-900">
            Painel Territorial de Risco Familiar
          </h2>
          <p class="text-sm text-slate-600 mt-1">
            Monitoramento longitudinal e priorização de visitas domiciliares para as equipes da Estratégia Saúde da Família.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            Total de Famílias Adscritas: <span class="font-bold text-slate-900">{{ familiasFiltradas.length }}</span>
          </div>
        </div>
      </div>

      <!-- Cards de Métricas Quantitativas por Faixa de Risco -->
      <PainelMetricasRisco
        :contagem-risco="contagemRisco"
        :total-familias="familiasFiltradas.length"
        :filtro-ativo="filtroFaixaRisco"
        @selecionar-filtro="faixa => filtroFaixaRisco = faixa"
      />

      <!-- Barra de Filtros e Busca de Campo -->
      <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        
        <!-- Campo de Pesquisa -->
        <div class="relative flex-1">
          <Icon name="lucide:search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="termoBusca"
            type="text"
            placeholder="Buscar por nome do responsável ou número de prontuário (ex: CX-1042)..."
            class="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
          />
        </div>

        <!-- Filtros Rápidos de Faixa de Risco -->
        <div class="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 md:pb-0">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Icon name="lucide:filter" class="w-3.5 h-3.5" />
            Filtrar:
          </span>

          <button
            type="button"
            :class="[
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              filtroFaixaRisco === 'TODAS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            ]"
            @click="filtroFaixaRisco = 'TODAS'"
          >
            Todas
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              filtroFaixaRisco === 'RISCO_MAIOR_R3'
                ? 'bg-red-700 text-white shadow-sm'
                : 'bg-red-50 text-red-900 border border-red-200 hover:bg-red-100'
            ]"
            @click="filtroFaixaRisco = 'RISCO_MAIOR_R3'"
          >
            R3 (Máximo)
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              filtroFaixaRisco === 'RISCO_MEDIO_R2'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-orange-50 text-orange-950 border border-orange-200 hover:bg-orange-100'
            ]"
            @click="filtroFaixaRisco = 'RISCO_MEDIO_R2'"
          >
            R2 (Médio)
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              filtroFaixaRisco === 'RISCO_MENOR_R1'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            ]"
            @click="filtroFaixaRisco = 'RISCO_MENOR_R1'"
          >
            R1 (Menor)
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              filtroFaixaRisco === 'SEM_RISCO_R0'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
            ]"
            @click="filtroFaixaRisco = 'SEM_RISCO_R0'"
          >
            R0 (Sem Risco)
          </button>
        </div>

      </div>

      <!-- Tabela / Lista de Famílias -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th class="py-4 px-6">Prontuário</th>
                <th class="py-4 px-6">Responsável Familiar</th>
                <th class="py-4 px-6">Microárea / Município</th>
                <th class="py-4 px-6">Membros</th>
                <th class="py-4 px-6">Estratificação de Risco (Explicável)</th>
                <th class="py-4 px-6 text-right">Ações de Campo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              <tr
                v-for="fam in familiasFiltradas"
                :key="fam.id"
                class="hover:bg-slate-50/80 transition-colors"
              >
                <!-- Prontuário -->
                <td class="py-4 px-6 font-mono font-bold text-slate-800 text-xs">
                  {{ fam.prontuarioFamiliar }}
                </td>

                <!-- Nome Responsável -->
                <td class="py-4 px-6">
                  <div class="font-bold text-slate-900">
                    {{ fam.responsavelNome }}
                  </div>
                  <div class="text-xs text-slate-500 mt-0.5">
                    Equipe: {{ fam.equipeId }}
                  </div>
                </td>

                <!-- Microárea & Município -->
                <td class="py-4 px-6">
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                    {{ fam.microareaId }}
                  </div>
                  <div class="text-xs text-slate-400 capitalize mt-0.5">
                    {{ fam.municipioId === 'coxim' ? 'UBS Coxim' : 'UBS Corumbá' }}
                  </div>
                </td>

                <!-- Quantidade de Membros -->
                <td class="py-4 px-6">
                  <span class="inline-flex items-center gap-1 text-slate-700 font-semibold text-xs">
                    <Icon name="lucide:users" class="w-3.5 h-3.5 text-slate-400" />
                    {{ fam.quantidadeMembros }} moradores
                  </span>
                </td>

                <!-- Badge Interativa de Risco (Abre o Drawer) -->
                <td class="py-4 px-6">
                  <BadgeRiscoFamiliar
                    :classificacao="fam.ultimaClassificacaoRisco"
                    :pontuacao="fam.ultimaPontuacaoRisco"
                    :interativo="true"
                    tamanho="md"
                    @click="abrirDrawerExplicativo(fam)"
                  />
                  <div v-if="fam.dataUltimaAvaliacao" class="text-[11px] text-slate-400 mt-1">
                    Última visita: {{ new Date(fam.dataUltimaAvaliacao).toLocaleDateString('pt-BR') }}
                  </div>
                </td>

                <!-- Ações -->
                <td class="py-4 px-6 text-right space-x-2">
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Inspecionar fatores de risco"
                    @click="abrirDrawerExplicativo(fam)"
                  >
                    Ver Fatores
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                    title="Realizar nova avaliação de risco com cálculo em tempo real"
                    @click="iniciarNovaAvaliacao(fam)"
                  >
                    Reavaliar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Estado Vazio -->
        <div
          v-if="familiasFiltradas.length === 0"
          class="p-12 text-center text-slate-500 space-y-2"
        >
          <Icon name="lucide:circle-help" class="w-8 h-8 text-slate-400 mx-auto" />
          <p class="font-bold text-slate-700 text-base">Nenhuma família encontrada para os filtros selecionados.</p>
          <p class="text-xs text-slate-500">Tente ajustar o termo de busca ou selecionar outra faixa de risco.</p>
        </div>

      </div>

    </main>

    <!-- Rodapé Institucional -->
    <footer class="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 space-y-1">
        <p class="font-semibold text-slate-700">
          PET-Saúde · Estratificação de Risco Familiar na Atenção Primária
        </p>
        <p>
          Unidades Básicas de Saúde Piloto: Coxim e Corumbá (Mato Grosso do Sul) · Conformidade estrita com LGPD (Lei 13.709/2018)
        </p>
      </div>
    </footer>

    <!-- Componente Gaveta Lateral (Drawer) de Risco Explicável -->
    <DrawerExplicativoRisco
      :aberto="drawerAberto"
      :avaliacao="avaliacaoSelecionada"
      :nome-familia="familiaSelecionada?.responsavelNome"
      :prontuario="familiaSelecionada?.prontuarioFamiliar"
      @fechar="fecharDrawer"
      @reavaliar="familiaSelecionada && iniciarNovaAvaliacao(familiaSelecionada)"
    />

    <!-- Modal de Nova Estratificação com Cálculo em Tempo Real -->
    <div
      v-if="modalAvaliacaoAberto && familiaEmAvaliacao"
      class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 md:p-10 flex items-center justify-center"
    >
      <div class="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <FormEstratificacaoRapida
          :familia-id="familiaEmAvaliacao.id"
          :nome-familia="familiaEmAvaliacao.responsavelNome"
          :prontuario="familiaEmAvaliacao.prontuarioFamiliar"
          :avaliacao-anterior="avaliacaoSelecionada"
          @salvar="salvarNovaAvaliacao"
          @cancelar="fecharModalAvaliacao"
        />
      </div>
    </div>

  </div>
</template>
