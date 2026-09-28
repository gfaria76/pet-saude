<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useFamilias } from '~/composables/useFamilias'
import { FaixaRisco, IndicadorRiscoCodigo } from '~~/shared/domain/risk-engine'
import { ICONES } from '~/utils/icones'
import CardFamiliaItem from '~/components/familia/CardFamiliaItem.vue'

const route = useRoute()
const {
  familias,
  filtroMunicipio,
  abrirDrawerExplicativo,
  obterHistoricoFamilia
} = useFamilias()

const termoBusca = ref('')
const faixaSelecionada = ref<string>('TODAS')
const microareaSelecionada = ref<string>('TODAS')
const sentinelaFiltro = ref<string>('TODAS')

// Sincroniza query param inicial se vier de navegação territorial
onMounted(() => {
  if (route.query.microarea && typeof route.query.microarea === 'string') {
    microareaSelecionada.value = route.query.microarea
  }
})

// Microáreas disponíveis
const microareasDisponiveis = computed(() => {
  const set = new Set<string>()
  for (const f of familias.value) {
    if (filtroMunicipio.value === 'todos' || f.municipioId === filtroMunicipio.value) {
      set.add(f.microareaId)
    }
  }
  return Array.from(set).sort()
})

const opcoesFaixa = [
  { label: 'Todas as Faixas', value: 'TODAS' },
  { label: 'R3 — Risco Máximo', value: FaixaRisco.RISCO_MAIOR_R3 },
  { label: 'R2 — Risco Médio', value: FaixaRisco.RISCO_MEDIO_R2 },
  { label: 'R1 — Risco Menor', value: FaixaRisco.RISCO_MENOR_R1 },
  { label: 'R0 — Sem Risco Identificado', value: FaixaRisco.SEM_RISCO_R0 }
]

const opcoesMicroarea = computed(() => [
  { label: 'Todas as Microáreas', value: 'TODAS' },
  ...microareasDisponiveis.value.map(ma => ({ label: `Microárea ${ma}`, value: ma }))
])

const opcoesSentinela = [
  { label: 'Todas as Condições', value: 'TODAS' },
  { label: 'Pessoa Acamada', value: IndicadorRiscoCodigo.IND_ACAMADO },
  { label: 'Desnutrição Grave', value: IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE },
  { label: 'Dependência Química', value: IndicadorRiscoCodigo.IND_DROGADICAO },
  { label: 'Hipertensão Arterial', value: IndicadorRiscoCodigo.IND_HIPERTENSAO },
  { label: 'Diabetes Mellitus', value: IndicadorRiscoCodigo.IND_DIABETES },
  { label: 'Idoso Maior de 70 Anos', value: IndicadorRiscoCodigo.IND_MAIOR_70_ANOS },
  { label: 'Criança Menor de 6 Meses', value: IndicadorRiscoCodigo.IND_MENOR_6_MESES },
  { label: 'Desemprego', value: IndicadorRiscoCodigo.IND_DESEMPREGO },
  { label: 'Adensamento Excessivo', value: IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO }
]

// Filtragem combinada avançada
const familiasFiltradasAvancadas = computed(() => {
  const busca = termoBusca.value.trim().toLowerCase()

  return familias.value.filter(fam => {
    // Município
    if (filtroMunicipio.value !== 'todos' && fam.municipioId !== filtroMunicipio.value) {
      return false
    }

    // Faixa
    if (faixaSelecionada.value !== 'TODAS' && fam.ultimaClassificacaoRisco !== faixaSelecionada.value) {
      return false
    }

    // Microárea
    if (microareaSelecionada.value !== 'TODAS' && fam.microareaId !== microareaSelecionada.value) {
      return false
    }

    // Busca textual
    if (busca) {
      const matchNome = fam.responsavelNome.toLowerCase().includes(busca)
      const matchProntuario = fam.prontuarioFamiliar.toLowerCase().includes(busca)
      if (!matchNome && !matchProntuario) return false
    }

    // Filtro por condição sentinela na última avaliação
    if (sentinelaFiltro.value !== 'TODAS') {
      const hist = obterHistoricoFamilia(fam.id)
      const ultima = hist.at(-1)
      if (!ultima) return false
      const temFator = ultima.fatoresDeterminantes.some(f => f.indicadorCodigo === sentinelaFiltro.value)
      if (!temFator) return false
    }

    return true
  })
})
</script>

<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          Diretório de Famílias Adscritas
        </h1>
        <p class="text-sm text-muted mt-1">
          Busca detalhada e prontuários territoriais das equipes de Coxim e Corumbá.
        </p>
      </div>

      <div class="text-xs text-muted bg-default border border-default px-3 py-2 rounded-xl shadow-xs self-start">
        Total Encontrado: <strong class="text-highlighted font-black">{{ familiasFiltradasAvancadas.length }}</strong> de {{ familias.length }} famílias
      </div>
    </div>

    <!-- Caixa de Filtros Avançados com UCard do Nuxt UI v4 -->
    <UCard
      class="border border-default shadow-xs"
      :ui="{
        root: 'rounded-2xl bg-default',
        body: 'p-5 space-y-4'
      }"
    >
      <!-- Linha 1: Busca com UInput -->
      <div>
        <UInput
          v-model="termoBusca"
          type="search"
          :icon="ICONES.buscar"
          placeholder="Buscar por nome do responsável familiar ou número do prontuário..."
          aria-label="Buscar família por nome do responsável ou prontuário"
          size="md"
          class="w-full"
        />
      </div>

      <!-- Linha 2: Filtros Combinados com USelect Nuxt UI v4 -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- Faixa de Risco -->
        <div>
          <label for="filtro-faixa" class="block text-[10px] font-extrabold uppercase tracking-wider text-muted mb-1">
            Faixa de Risco
          </label>
          <USelect
            id="filtro-faixa"
            v-model="faixaSelecionada"
            :items="opcoesFaixa"
            value-key="value"
            size="sm"
            class="w-full font-semibold"
          />
        </div>

        <!-- Microárea do ACS -->
        <div>
          <label for="filtro-microarea" class="block text-[10px] font-extrabold uppercase tracking-wider text-muted mb-1">
            Microárea do ACS
          </label>
          <USelect
            id="filtro-microarea"
            v-model="microareaSelecionada"
            :items="opcoesMicroarea"
            value-key="value"
            size="sm"
            class="w-full font-semibold"
          />
        </div>

        <!-- Condição Sentinela Específica -->
        <div>
          <label for="filtro-sentinela" class="block text-[10px] font-extrabold uppercase tracking-wider text-muted mb-1">
            Condição Sentinela Ativa
          </label>
          <USelect
            id="filtro-sentinela"
            v-model="sentinelaFiltro"
            :items="opcoesSentinela"
            value-key="value"
            size="sm"
            class="w-full font-semibold"
          />
        </div>
      </div>
    </UCard>

    <!-- Lista de Famílias em Grade Responsiva -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CardFamiliaItem
        v-for="fam in familiasFiltradasAvancadas"
        :key="fam.id"
        :familia="fam"
        @abrir-drawer="abrirDrawerExplicativo"
      />
    </div>

    <!-- Estado Vazio -->
    <div
      v-if="familiasFiltradasAvancadas.length === 0"
      class="p-12 text-center text-muted bg-default rounded-2xl border border-default space-y-2"
    >
      <Icon :name="ICONES.vazio" class="w-8 h-8 text-dimmed mx-auto" aria-hidden="true" />
      <p class="font-bold text-toned text-base">Nenhuma família encontrada para os critérios selecionados.</p>
      <p class="text-xs text-muted">Ajuste os filtros de busca ou limpe a pesquisa.</p>
    </div>
  </div>
</template>
