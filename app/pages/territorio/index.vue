<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFamilias } from '~/composables/useFamilias'
import { FaixaRisco } from '~~/shared/domain/risk-engine'
import { ICONES } from '~/utils/icones'

const router = useRouter()
const { familias, filtroMunicipio } = useFamilias()

// Opções de território para o USelect do Nuxt UI v4
const opcoesPolo = [
  { label: 'Todos os Polos (Coxim & Corumbá)', value: 'todos' },
  { label: 'Polo Coxim (MS) — UBS Senhor Divino', value: 'coxim' },
  { label: 'Polo Corumbá (MS) — UBS Centro/Cervejaria', value: 'corumba' }
]

// Filtro reativo de famílias
const familiasFiltradas = computed(() => {
  if (filtroMunicipio.value === 'todos') return familias.value
  return familias.value.filter(f => f.municipioId === filtroMunicipio.value)
})

// KPIs territoriais
const totalFamilias = computed(() => familiasFiltradas.value.length)

const contagemRisco = computed(() => {
  const cont = {
    [FaixaRisco.SEM_RISCO_R0]: 0,
    [FaixaRisco.RISCO_MENOR_R1]: 0,
    [FaixaRisco.RISCO_MEDIO_R2]: 0,
    [FaixaRisco.RISCO_MAIOR_R3]: 0
  }
  for (const f of familiasFiltradas.value) {
    if (f.ultimaClassificacaoRisco) {
      cont[f.ultimaClassificacaoRisco]++
    }
  }
  return cont
})

const totalCriticos = computed(() => {
  return contagemRisco.value[FaixaRisco.RISCO_MEDIO_R2] + contagemRisco.value[FaixaRisco.RISCO_MAIOR_R3]
})

const percentualCriticos = computed(() => {
  if (totalFamilias.value === 0) return 0
  return Math.round((totalCriticos.value / totalFamilias.value) * 100)
})

// Vácuo Assistencial: Famílias R2 ou R3 há mais de 30 dias sem visita registrada
const familiasAtrasadas = computed(() => {
  const limiteMs = 30 * 24 * 60 * 60 * 1000
  const agora = Date.now()
  return familiasFiltradas.value.filter(f => {
    if (f.ultimaClassificacaoRisco !== FaixaRisco.RISCO_MAIOR_R3 && f.ultimaClassificacaoRisco !== FaixaRisco.RISCO_MEDIO_R2) {
      return false
    }
    if (!f.dataUltimaAvaliacao) return true
    const tempoDecorrido = agora - new Date(f.dataUltimaAvaliacao).getTime()
    return tempoDecorrido > limiteMs
  })
})

// Agrupamento por Microárea para Tabela e Gráfico
interface MicroareaAgrupada {
  id: string
  municipioId: string
  municipioNome: string
  equipeId: string
  microareaId: string
  total: number
  R0: number
  R1: number
  R2: number
  R3: number
  percentualR3: number
}

const dadosMicroareas = computed<MicroareaAgrupada[]>(() => {
  const mapa = new Map<string, MicroareaAgrupada>()

  for (const f of familiasFiltradas.value) {
    const chave = `${f.municipioId}-${f.equipeId}-${f.microareaId}`
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        id: chave,
        municipioId: f.municipioId,
        municipioNome: f.municipioId === 'coxim' ? 'UBS Coxim' : 'UBS Corumbá',
        equipeId: f.equipeId,
        microareaId: f.microareaId,
        total: 0,
        R0: 0,
        R1: 0,
        R2: 0,
        R3: 0,
        percentualR3: 0
      })
    }

    const item = mapa.get(chave)!
    item.total++
    if (f.ultimaClassificacaoRisco === FaixaRisco.SEM_RISCO_R0) item.R0++
    else if (f.ultimaClassificacaoRisco === FaixaRisco.RISCO_MENOR_R1) item.R1++
    else if (f.ultimaClassificacaoRisco === FaixaRisco.RISCO_MEDIO_R2) item.R2++
    else if (f.ultimaClassificacaoRisco === FaixaRisco.RISCO_MAIOR_R3) item.R3++
  }

  return Array.from(mapa.values()).map(m => ({
    ...m,
    percentualR3: m.total > 0 ? Math.round((m.R3 / m.total) * 100) : 0
  })).sort((a, b) => b.R3 - a.R3)
})

// Configuração do Gráfico de Barras Empilhadas ECharts (Cores Clínicas WCAG 2.1 AA)
const modoCor = useColorMode()
const coresGrafico = computed(() => modoCor.value === 'dark'
  ? { texto: '#cbd5e1', borda: '#64748b', fundo: '#0f172a' }
  : { texto: '#475569', borda: '#cbd5e1', fundo: '#ffffff' })

const barOption = computed(() => {
  const microareas = dadosMicroareas.value.map(m => `${m.microareaId} (${m.municipioId === 'coxim' ? 'CX' : 'CB'})`)
  const r0Data = dadosMicroareas.value.map(m => m.R0)
  const r1Data = dadosMicroareas.value.map(m => m.R1)
  const r2Data = dadosMicroareas.value.map(m => m.R2)
  const r3Data = dadosMicroareas.value.map(m => m.R3)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 11, color: coresGrafico.value.texto }
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '8%',
      bottom: '16%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: microareas,
      axisLine: { lineStyle: { color: coresGrafico.value.borda } },
      axisLabel: { color: coresGrafico.value.texto, fontWeight: 600, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: 'Famílias',
      splitLine: { lineStyle: { color: coresGrafico.value.borda } },
      axisLabel: { color: coresGrafico.value.texto, fontSize: 11 }
    },
    series: [
      {
        name: 'Sem Risco (R0)',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        itemStyle: { color: '#15803D' },
        data: r0Data
      },
      {
        name: 'Risco Menor (R1)',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        itemStyle: { color: '#B45309' },
        data: r1Data
      },
      {
        name: 'Risco Médio (R2)',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        itemStyle: { color: '#C2410C' },
        data: r2Data
      },
      {
        name: 'Risco Máximo (R3)',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        itemStyle: { color: '#B91C1C' },
        data: r3Data
      }
    ]
  }
})

// Configuração do Gráfico Donut ECharts (Cores Clínicas WCAG 2.1 AA)
const donutOption = computed(() => {
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: <strong>{c} famílias</strong> ({d}%)'
    },
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 11, color: coresGrafico.value.texto }
    },
    series: [
      {
        name: 'Carga de Risco',
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: coresGrafico.value.fundo,
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: contagemRisco.value[FaixaRisco.SEM_RISCO_R0], name: 'Sem Risco (R0)', itemStyle: { color: '#15803D' } },
          { value: contagemRisco.value[FaixaRisco.RISCO_MENOR_R1], name: 'Risco Menor (R1)', itemStyle: { color: '#B45309' } },
          { value: contagemRisco.value[FaixaRisco.RISCO_MEDIO_R2], name: 'Risco Médio (R2)', itemStyle: { color: '#C2410C' } },
          { value: contagemRisco.value[FaixaRisco.RISCO_MAIOR_R3], name: 'Risco Máximo (R3)', itemStyle: { color: '#B91C1C' } }
        ]
      }
    ]
  }
})

// Indicadores Sentinela prevalentes no território para o UProgress
const indicadoresPrevalentes = computed(() => [
  {
    nome: 'Hipertensão Arterial (Crônico)',
    icone: 'healthicons:blood-pressure',
    qtd: 2,
    percentual: totalFamilias.value > 0 ? Math.round((2 / totalFamilias.value) * 100) : 0
  },
  {
    nome: 'Maior de 70 Anos (Extremo Idade)',
    icone: 'healthicons:elderly',
    qtd: 1,
    percentual: totalFamilias.value > 0 ? Math.round((1 / totalFamilias.value) * 100) : 0
  },
  {
    nome: 'Dependência Química / Drogadição',
    icone: 'healthicons:alcohol',
    qtd: 2,
    percentual: totalFamilias.value > 0 ? Math.round((2 / totalFamilias.value) * 100) : 0
  },
  {
    nome: 'Desnutrição Grave (Nutricional)',
    icone: 'healthicons:malnutrition',
    qtd: 1,
    percentual: totalFamilias.value > 0 ? Math.round((1 / totalFamilias.value) * 100) : 0
  },
  {
    nome: 'Adensamento Excessivo (>1/cômodo)',
    icone: 'healthicons:i-groups-perspective-crowd',
    qtd: 1,
    percentual: totalFamilias.value > 0 ? Math.round((1 / totalFamilias.value) * 100) : 0
  }
])

// Colunas do UTable do Nuxt UI v4
const colunasTabela = [
  { accessorKey: 'microareaId', header: 'Microárea' },
  { accessorKey: 'municipioNome', header: 'Polo / UBS' },
  { accessorKey: 'equipeId', header: 'Equipe eSF' },
  { accessorKey: 'total', header: 'Famílias' },
  { accessorKey: 'R3', header: 'R3 (Máximo)' },
  { accessorKey: 'R2', header: 'R2 (Médio)' },
  { accessorKey: 'R1', header: 'R1 (Menor)' },
  { accessorKey: 'R0', header: 'R0 (Sem Risco)' },
  { id: 'acoes', header: 'Ações' }
]

function verFamiliasMicroarea(microareaId: string) {
  router.push(`/familias?microarea=${microareaId}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Cabeçalho e Filtro Territorial com USelect -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-default p-5 rounded-2xl border border-default shadow-xs">
      <div>
        <div class="flex items-center gap-2">
          <span class="p-2 rounded-xl bg-primary/10 text-primary border border-primary/30">
            <Icon :name="ICONES.atencaoPrimaria" class="w-5 h-5" aria-hidden="true" />
          </span>
          <h1 class="text-xl sm:text-2xl font-black text-highlighted tracking-tight">
            Inteligência Territorial da Atenção Primária
          </h1>
        </div>
        <p class="text-xs text-muted mt-1">
          Monitoramento e estratificação de vulnerabilidade por microárea e equipe da eSF (Escala ERF-CS).
        </p>
      </div>

      <!-- Seletor com USelect pronto do Nuxt UI v4 -->
      <div class="w-full md:w-80">
        <label for="filtro-polo" class="text-[10px] uppercase tracking-wider font-bold text-muted block mb-1">
          Filtrar Território Ativo
        </label>
        <USelect
          id="filtro-polo"
          v-model="filtroMunicipio"
          :items="opcoesPolo"
          value-key="value"
          size="sm"
          :icon="ICONES.municipio"
          class="w-full font-semibold"
        />
      </div>
    </div>

    <!-- 4 Cards de KPIs Executivos com UCard -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Famílias -->
      <UCard
        class="border border-default shadow-xs"
        :ui="{ root: 'rounded-2xl bg-default', body: 'p-4' }"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-muted uppercase tracking-wider">Famílias Adscritas</span>
          <span class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon :name="ICONES.familia" class="w-4 h-4" aria-hidden="true" />
          </span>
        </div>
        <p class="text-2xl font-black text-highlighted mt-2">{{ totalFamilias }}</p>
        <p class="text-[11px] text-muted mt-1">
          {{ filtroMunicipio === 'todos' ? 'Coxim e Corumbá' : 'Polo selecionado' }}
        </p>
      </UCard>

      <!-- Carga Crítica R2 + R3 -->
      <UCard
        class="border border-default shadow-xs"
        :ui="{ root: 'rounded-2xl bg-default', body: 'p-4' }"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-muted uppercase tracking-wider">Carga Crítica (R2+R3)</span>
          <span class="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
            <Icon :name="ICONES.agravamento" class="w-4 h-4" aria-hidden="true" />
          </span>
        </div>
        <div class="flex items-baseline gap-2 mt-2">
          <p class="text-2xl font-black text-red-700">{{ totalCriticos }}</p>
          <span class="text-xs font-bold text-muted">({{ percentualCriticos }}% do polo)</span>
        </div>
        <p class="text-[11px] text-muted mt-1">Exigem Plano Singular de Cuidado</p>
      </UCard>

      <!-- Vácuo Assistencial -->
      <UCard
        class="border border-default shadow-xs"
        :ui="{ root: 'rounded-2xl bg-default', body: 'p-4' }"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-muted uppercase tracking-wider">Vácuo Assistencial</span>
          <span class="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Icon :name="ICONES.calendario" class="w-4 h-4" aria-hidden="true" />
          </span>
        </div>
        <p class="text-2xl font-black text-amber-700 mt-2">{{ familiasAtrasadas.length }}</p>
        <p class="text-[11px] text-muted mt-1">Famílias R2/R3 há >30d sem visita</p>
      </UCard>

      <!-- Alerta Bioclimático Pantaneiro -->
      <UCard
        class="border border-default shadow-xs"
        :ui="{ root: 'rounded-2xl bg-default', body: 'p-4' }"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-muted uppercase tracking-wider">Contexto Bioclimático</span>
          <span class="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
            <Icon :name="filtroMunicipio === 'corumba' ? ICONES.alagamento : ICONES.calorExtremo" class="w-5 h-5" aria-hidden="true" />
          </span>
        </div>
        <p class="text-base font-extrabold text-highlighted mt-2 truncate">
          {{ filtroMunicipio === 'corumba' ? 'Alagamentos / Cheia' : 'Onda de Calor / Seca' }}
        </p>
        <p class="text-[11px] text-muted mt-1">
          {{ filtroMunicipio === 'corumba' ? 'Acesso fluvial e ribeirinho' : 'Atenção térmica em idosos' }}
        </p>
      </UCard>
    </div>

    <!-- Seção de Gráficos com nuxt-echarts (VChart) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Gráfico 1: Barras Empilhadas por Microárea (VChart) -->
      <UCard
        class="lg:col-span-2 border border-default shadow-xs"
        :ui="{ root: 'rounded-2xl bg-default flex flex-col justify-between', body: 'p-5 space-y-4' }"
      >
        <div class="flex items-center justify-between border-b border-default pb-3">
          <div>
            <h2 class="text-sm font-bold text-highlighted">
              Carga de Risco por Microárea do ACS
            </h2>
            <p class="text-xs text-muted">Distribuição estratificada das famílias por microárea</p>
          </div>
          <UBadge color="neutral" variant="subtle" size="xs">
            ECharts Empilhado
          </UBadge>
        </div>

        <div v-if="dadosMicroareas.length > 0" class="pt-2">
          <VChart
            :option="barOption"
            autoresize
            class="h-64 w-full"
          />
        </div>
        <div v-else class="h-48 flex items-center justify-center text-xs text-dimmed">
          Nenhuma microárea encontrada com o filtro selecionado.
        </div>
      </UCard>

      <!-- Gráfico 2: Donut Consolidado do Território (VChart) -->
      <UCard
        class="border border-default shadow-xs"
        :ui="{ root: 'rounded-2xl bg-default flex flex-col justify-between', body: 'p-5 space-y-4' }"
      >
        <div class="flex items-center justify-between border-b border-default pb-3">
          <div>
            <h2 class="text-sm font-bold text-highlighted">
              Carga Consolidada de Risco
            </h2>
            <p class="text-xs text-muted">Proporção global do polo ativo</p>
          </div>
          <UBadge color="neutral" variant="subtle" size="xs">
            ECharts Donut
          </UBadge>
        </div>

        <div class="flex items-center justify-center pt-2">
          <VChart
            :option="donutOption"
            autoresize
            class="h-64 w-full"
          />
        </div>
      </UCard>
    </div>

    <!-- Prevalência dos Indicadores Sentinela de Coelho-Savassi (com UProgress do Nuxt UI v4) -->
    <UCard
      class="border border-default shadow-xs"
      :ui="{ root: 'rounded-2xl bg-default', body: 'p-5 space-y-4' }"
    >
      <div class="flex items-center justify-between border-b border-default pb-3">
        <div>
          <h2 class="text-sm font-bold text-highlighted flex items-center gap-2">
            <Icon :name="ICONES.escala" class="w-4 h-4 text-primary" aria-hidden="true" />
            <span>Prevalência de Vulnerabilidades e Sentinelas no Território</span>
          </h2>
          <p class="text-xs text-muted">
            Frequência observada dos 13 indicadores da Escala Coelho-Savassi para subsidiar ações coletivas na UBS.
          </p>
        </div>
        <UBadge color="primary" variant="subtle" size="xs">
          Indicadores Mais Frequentes
        </UBadge>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
        <div
          v-for="ind in indicadoresPrevalentes"
          :key="ind.nome"
          class="p-3.5 rounded-xl border border-default bg-muted space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <Icon :name="ind.icone" class="w-4 h-4 text-toned shrink-0" aria-hidden="true" />
              <span class="text-xs font-bold text-default truncate">{{ ind.nome }}</span>
            </div>
            <span class="text-xs font-extrabold text-primary bg-default px-2 py-0.5 rounded border border-default">
              {{ ind.qtd }} fam.
            </span>
          </div>
          <!-- UProgress pronto do Nuxt UI v4 -->
          <UProgress :model-value="ind.percentual" :max="100" size="sm" color="primary" />
          <div class="flex justify-between text-[11px] text-muted">
            <span>Prevalência no território</span>
            <span class="font-bold text-toned">{{ ind.percentual }}%</span>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Tabela de Priorização Operacional por Microárea com UTable do Nuxt UI v4 -->
    <UCard
      class="border border-default shadow-xs"
      :ui="{ root: 'rounded-2xl bg-default overflow-hidden', body: 'p-0 sm:p-0' }"
    >
      <div class="p-5 border-b border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-highlighted">
            Priorização Operacional por Microárea
          </h2>
          <p class="text-xs text-muted mt-0.5">
            Carga de trabalho para planejamento das visitas domiciliares de ACS e equipe multiprofissional.
          </p>
        </div>
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ dadosMicroareas.length }} microáreas ativas
        </UBadge>
      </div>

      <!-- UTable pronto do Nuxt UI v4 -->
      <UTable :columns="colunasTabela" :data="dadosMicroareas">
        <!-- Célula da Microárea -->
        <template #microareaId-cell="{ row }">
          <UBadge color="primary" variant="subtle" size="sm" class="font-bold font-mono">
            {{ row.original.microareaId }}
          </UBadge>
        </template>

        <!-- Célula do Município -->
        <template #municipioNome-cell="{ row }">
          <span class="font-bold text-default text-xs">
            {{ row.original.municipioNome }}
          </span>
        </template>

        <!-- Célula da Equipe -->
        <template #equipeId-cell="{ row }">
          <span class="inline-flex items-center gap-1.5 text-xs text-muted font-medium">
            <Icon :name="ICONES.equipeSaude" class="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>{{ row.original.equipeId }}</span>
          </span>
        </template>

        <!-- Célula Total -->
        <template #total-cell="{ row }">
          <span class="font-extrabold text-highlighted text-xs">
            {{ row.original.total }}
          </span>
        </template>

        <!-- Célula R3 -->
        <template #R3-cell="{ row }">
          <span class="px-2 py-0.5 rounded-full font-bold text-xs bg-red-100 text-red-900 border border-red-200">
            {{ row.original.R3 }}
          </span>
        </template>

        <!-- Célula R2 -->
        <template #R2-cell="{ row }">
          <span class="px-2 py-0.5 rounded-full font-bold text-xs bg-orange-100 text-orange-900 border border-orange-200">
            {{ row.original.R2 }}
          </span>
        </template>

        <!-- Célula R1 -->
        <template #R1-cell="{ row }">
          <span class="px-2 py-0.5 rounded-full font-bold text-xs bg-amber-100 text-amber-900 border border-amber-200">
            {{ row.original.R1 }}
          </span>
        </template>

        <!-- Célula R0 -->
        <template #R0-cell="{ row }">
          <span class="px-2 py-0.5 rounded-full font-bold text-xs bg-green-100 text-green-900 border border-green-200">
            {{ row.original.R0 }}
          </span>
        </template>

        <!-- Célula Ações -->
        <template #acoes-cell="{ row }">
          <UButton
            size="xs"
            color="primary"
            variant="subtle"
            label="Famílias"
            :icon="ICONES.familia"
            class="font-semibold cursor-pointer"
            @click="verFamiliasMicroarea(row.original.microareaId)"
          />
        </template>
      </UTable>
    </UCard>
  </div>
</template>
