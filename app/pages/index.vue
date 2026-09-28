<script setup lang="ts">
import { useFamilias } from '~/composables/useFamilias'
import { estiloFaixa, FAIXAS_POR_PRIORIDADE } from '~/utils/estiloFaixaRisco'
import { ICONES } from '~/utils/icones'
import PainelMetricasRisco from '~/components/PainelMetricasRisco.vue'
import BadgeRiscoFamiliar from '~/components/BadgeRiscoFamiliar.vue'
import CardFamiliaItem from '~/components/familia/CardFamiliaItem.vue'
import MapaCalorRiscoTerritorio from '~/components/risco/MapaCalorRiscoTerritorio.client.vue'

const {
  familiasFiltradas,
  contagemRisco,
  agregacaoRiscoPorMicroarea,
  microareas,
  totalFamiliasMunicipio,
  filtroFaixaRisco,
  termoBusca,
  abrirDrawerExplicativo
} = useFamilias()

const colunasTabela = [
  { accessorKey: 'prontuarioFamiliar', header: 'Prontuário' },
  { accessorKey: 'responsavelNome', header: 'Responsável Familiar' },
  { accessorKey: 'microareaId', header: 'Microárea / Município' },
  { accessorKey: 'quantidadeMembros', header: 'Membros' },
  { accessorKey: 'ultimaClassificacaoRisco', header: 'Estratificação (Explicável)' },
  { id: 'acoes', header: 'Ações de Campo' }
]
</script>

<template>
  <div class="space-y-8">
    
    <!-- Cabeçalho Informativo & Alerta PET-Saúde Clima -->
    <div class="space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
            Painel Territorial de Risco Familiar
          </h1>
          <p class="text-sm text-muted mt-1">
            Monitoramento longitudinal e priorização de visitas domiciliares para as equipes da Estratégia Saúde da Família.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <UButton
            to="/familias"
            color="neutral"
            variant="outline"
            :icon="ICONES.familia"
            label="Ver Todas as Famílias"
            class="font-bold shadow-xs"
          />
        </div>
      </div>

      <!-- Alerta Climático & Epidemiológico (PET-Saúde Clima) -->
      <UAlert
        :icon="ICONES.clima"
        color="primary"
        variant="solid"
        title="PET-Saúde Clima · Vertente Ambiental e Saúde da Família"
        description="Período de estiagem e altas temperaturas em Coxim e Corumbá. Priorize visitas domiciliares a famílias com idosos (≥ 70 anos), crianças menores de 6 meses e portadores de hipertensão ou acamados em moradias com saneamento inadequado."
        :ui="{
          root: 'rounded-2xl p-4 bg-elevated text-default border border-default shadow-md',
          title: 'text-xs font-black uppercase tracking-wider text-muted',
          description: 'text-sm text-muted mt-1 leading-relaxed',
          icon: 'w-6 h-6 text-primary'
        }"
      />
    </div>

    <!-- Cards de Métricas Quantitativas por Faixa de Risco (R3 a R0) -->
    <section aria-labelledby="titulo-metricas">
      <h2 id="titulo-metricas" class="sr-only">Distribuição de Famílias por Faixa de Risco</h2>
      <PainelMetricasRisco
        :contagem-risco="contagemRisco"
        :total-familias="totalFamiliasMunicipio"
        :filtro-ativo="filtroFaixaRisco"
        @selecionar-filtro="faixa => filtroFaixaRisco = faixa"
      />
    </section>

    <!-- Mapa de Calor Territorial: prevalência de condições de risco por microárea -->
    <section aria-labelledby="titulo-mapa-calor" class="p-4 bg-default rounded-2xl border border-default shadow-xs">
      <h2 id="titulo-mapa-calor" class="sr-only">Mapa de Calor Territorial de Condições de Risco</h2>
      <MapaCalorRiscoTerritorio :agregacoes="agregacaoRiscoPorMicroarea" :microareas="microareas" />
    </section>

    <!-- Barra de Filtros Rápidos e Pesquisa -->
    <div class="p-4 bg-default rounded-2xl border border-default shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
      
      <!-- Campo de Pesquisa com UInput do Nuxt UI v4 -->
      <div class="flex-1">
        <UInput
          v-model="termoBusca"
          type="search"
          :icon="ICONES.buscar"
          placeholder="Buscar por responsável ou prontuário (ex: CX-1042, Maria)..."
          aria-label="Buscar família por nome ou prontuário"
          size="md"
          class="w-full"
          :ui="{
            root: 'w-full'
          }"
        />
      </div>

      <!-- Filtros de Faixa de Risco -->
      <div class="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 md:pb-0" role="toolbar" aria-label="Filtro por faixa de risco">
        <span class="text-xs font-bold text-dimmed uppercase tracking-wider flex items-center gap-1 mr-1">
          <Icon :name="ICONES.filtro" class="w-3.5 h-3.5" aria-hidden="true" />
          Filtro:
        </span>

        <UButton
          size="xs"
          :color="filtroFaixaRisco === 'TODAS' ? 'primary' : 'neutral'"
          :variant="filtroFaixaRisco === 'TODAS' ? 'solid' : 'ghost'"
          label="Todas"
          class="font-bold"
          @click="filtroFaixaRisco = 'TODAS'"
        />

        <button
          v-for="faixa in FAIXAS_POR_PRIORIDADE"
          :key="faixa"
          type="button"
          :aria-pressed="filtroFaixaRisco === faixa"
          :class="[
            'px-2.5 py-1 text-xs font-bold rounded-lg border inline-flex items-center gap-1 cursor-pointer whitespace-nowrap transition-all',
            filtroFaixaRisco === faixa ? estiloFaixa(faixa).solido + ' border-transparent' : estiloFaixa(faixa).suave
          ]"
          @click="filtroFaixaRisco = faixa"
        >
          <Icon :name="estiloFaixa(faixa).icone" class="w-3.5 h-3.5" aria-hidden="true" />
          {{ estiloFaixa(faixa).sigla }}
        </button>
      </div>

    </div>

    <!-- Visão Mobile: Lista de Cartões de Toque Amplo -->
    <div class="md:hidden space-y-3">
      <CardFamiliaItem
        v-for="fam in familiasFiltradas"
        :key="fam.id"
        :familia="fam"
        @abrir-drawer="abrirDrawerExplicativo"
      />
    </div>

    <!-- Visão Desktop/Tablet: Tabela Territorial Completa com UTable do Nuxt UI v4 -->
    <UCard
      class="hidden md:block border border-default shadow-xs"
      :ui="{
        root: 'rounded-2xl bg-default overflow-hidden',
        body: 'p-0 sm:p-0'
      }"
    >
      <UTable :columns="colunasTabela" :data="familiasFiltradas">
        <!-- Prontuário -->
        <template #prontuarioFamiliar-cell="{ row }">
          <NuxtLink :to="`/familias/${row.original.id}`" class="font-mono font-bold text-default text-xs hover:text-primary hover:underline">
            {{ row.original.prontuarioFamiliar }}
          </NuxtLink>
        </template>

        <!-- Responsável Familiar -->
        <template #responsavelNome-cell="{ row }">
          <div>
            <NuxtLink :to="`/familias/${row.original.id}`" class="font-bold text-highlighted hover:text-primary block text-xs">
              {{ row.original.responsavelNome }}
            </NuxtLink>
            <div class="text-[11px] text-muted mt-0.5">
              Equipe: {{ row.original.equipeId }}
            </div>
          </div>
        </template>

        <!-- Microárea & Município -->
        <template #microareaId-cell="{ row }">
          <div>
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ row.original.microareaId }}
            </UBadge>
            <div class="text-[11px] text-dimmed capitalize mt-0.5">
              {{ row.original.municipioId === 'coxim' ? 'UBS Coxim' : 'UBS Corumbá' }}
            </div>
          </div>
        </template>

        <!-- Quantidade de Membros -->
        <template #quantidadeMembros-cell="{ row }">
          <span class="inline-flex items-center gap-1 text-toned font-semibold text-xs">
            <Icon :name="ICONES.familia" class="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            {{ row.original.quantidadeMembros }} moradores
          </span>
        </template>

        <!-- Badge Interativa de Risco -->
        <template #ultimaClassificacaoRisco-cell="{ row }">
          <div>
            <BadgeRiscoFamiliar
              :classificacao="row.original.ultimaClassificacaoRisco"
              :pontuacao="row.original.ultimaPontuacaoRisco"
              :interativo="true"
              tamanho="md"
              @click="abrirDrawerExplicativo(row.original)"
            />
            <div v-if="row.original.dataUltimaAvaliacao" class="text-[10px] text-dimmed mt-1">
              Última avaliação: {{ new Date(row.original.dataUltimaAvaliacao).toLocaleDateString('pt-BR') }}
            </div>
          </div>
        </template>

        <!-- Ações -->
        <template #acoes-cell="{ row }">
          <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              label="Ver Fatores"
              class="font-semibold cursor-pointer"
              @click="abrirDrawerExplicativo(row.original)"
            />
            <UButton
              :to="`/familias/${row.original.id}`"
              size="xs"
              color="primary"
              variant="subtle"
              label="Dossiê"
              class="font-semibold"
            />
            <UButton
              :to="`/familias/${row.original.id}/avaliar`"
              size="xs"
              color="primary"
              label="Reavaliar"
              class="font-bold shadow-xs"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Estado Vazio -->
    <div
      v-if="familiasFiltradas.length === 0"
      class="p-12 text-center text-muted bg-default rounded-2xl border border-default space-y-2"
    >
      <Icon :name="ICONES.vazio" class="w-8 h-8 text-dimmed mx-auto" aria-hidden="true" />
      <p class="font-bold text-toned text-base">Nenhuma família encontrada para os filtros selecionados.</p>
      <p class="text-xs text-muted">Tente ajustar o termo de busca ou selecionar outra faixa de risco.</p>
    </div>

  </div>
</template>
