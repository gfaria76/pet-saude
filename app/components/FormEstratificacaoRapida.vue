<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IndicadorRiscoCodigo,
  type ItemIndicadorEntrada,
  type DadosAvaliacaoEntrada,
  type ResultadoEstratificacaoRisco,
  calcularEstratificacaoRisco,
  METADADOS_INDICADORES
} from '~~/shared/domain/risk-engine'

const props = defineProps<{
  familiaId: string
  nomeFamilia: string
  prontuario?: string
  avaliacaoAnterior?: ResultadoEstratificacaoRisco | null
}>()

const emit = defineEmits<{
  (e: 'salvar', resultado: ResultadoEstratificacaoRisco): void
  (e: 'cancelar'): void
}>()

// Estado reativo dos indicadores (iniciam desmarcados por padrão para rapidez)
const estadoIndicadores = ref<Record<IndicadorRiscoCodigo, { ativo: boolean; individuoNome: string }>>({
  [IndicadorRiscoCodigo.IND_ACAMADO]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_DEFICIENCIA_MENTAL]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_DROGADICAO]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_DESEMPREGO]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_ANALFABETISMO]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_MENOR_6_MESES]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_MAIOR_70_ANOS]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_HIPERTENSAO]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_DIABETES]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO]: { ativo: false, individuoNome: '' },
  [IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO]: { ativo: false, individuoNome: '' }
})

// Grupos semânticos para facilitar preenchimento pelo ACS
const gruposIndicadores = [
  {
    titulo: '1. Condições de Domicílio e Saneamento',
    codigos: [
      IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO,
      IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO
    ]
  },
  {
    titulo: '2. Vulnerabilidade Social e Econômica',
    codigos: [
      IndicadorRiscoCodigo.IND_DESEMPREGO,
      IndicadorRiscoCodigo.IND_DROGADICAO,
      IndicadorRiscoCodigo.IND_ANALFABETISMO
    ]
  },
  {
    titulo: '3. Condições Clínicas e Dependência Severa (Gatilhos de Alto Risco)',
    codigos: [
      IndicadorRiscoCodigo.IND_ACAMADO,
      IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA,
      IndicadorRiscoCodigo.IND_DEFICIENCIA_MENTAL,
      IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE
    ]
  },
  {
    titulo: '4. Condições Crônicas e Ciclo de Vida',
    codigos: [
      IndicadorRiscoCodigo.IND_HIPERTENSAO,
      IndicadorRiscoCodigo.IND_DIABETES,
      IndicadorRiscoCodigo.IND_MENOR_6_MESES,
      IndicadorRiscoCodigo.IND_MAIOR_70_ANOS
    ]
  }
]

// Cálculo reativo em tempo real via Motor Puro de Domínio
const calculoPreview = computed(() => {
  const listaIndicadores: ItemIndicadorEntrada[] = Object.entries(estadoIndicadores.value).map(
    ([codigo, val]) => ({
      codigo: codigo as IndicadorRiscoCodigo,
      ativo: val.ativo,
      individuoNome: val.individuoNome.trim() || undefined
    })
  )

  const entrada: DadosAvaliacaoEntrada = {
    familiaId: props.familiaId,
    indicadores: listaIndicadores,
    avaliacaoAnterior: props.avaliacaoAnterior
      ? {
          id: 'ant-ref',
          data: props.avaliacaoAnterior.dataAvaliacao,
          pontuacao: props.avaliacaoAnterior.pontuacaoTotal,
          classificacao: props.avaliacaoAnterior.classificacao,
          fatores: props.avaliacaoAnterior.fatoresDeterminantes
        }
      : undefined
  }

  return calcularEstratificacaoRisco(entrada)
})

function alternarIndicador(codigo: IndicadorRiscoCodigo) {
  estadoIndicadores.value[codigo].ativo = !estadoIndicadores.value[codigo].ativo
}

function handleSalvar() {
  emit('salvar', calculoPreview.value)
}
</script>

<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-4xl mx-auto">
    <!-- Barra Superior de Identificação da Família -->
    <div class="bg-slate-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
            Nova Estratificação
          </span>
          <span v-if="prontuario" class="text-xs text-slate-300">
            Prontuário Familiar #{{ prontuario }}
          </span>
        </div>
        <h2 class="text-xl font-bold mt-1 text-white">
          {{ nomeFamilia }}
        </h2>
        <p class="text-xs text-slate-400 mt-0.5">
          Escala de Risco Familiar de Coelho-Savassi · UBSs Coxim & Corumbá
        </p>
      </div>

      <!-- Preview do Escore em Tempo Real -->
      <div class="bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 flex items-center gap-4 shrink-0 shadow-inner">
        <div>
          <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
            Escore em Tempo Real
          </span>
          <span class="text-2xl font-black text-white">
            {{ calculoPreview.pontuacaoTotal }} <span class="text-xs font-normal text-slate-400">pontos</span>
          </span>
        </div>
        <BadgeRiscoFamiliar
          :classificacao="calculoPreview.classificacao"
          :pontuacao="calculoPreview.pontuacaoTotal"
          :interativo="false"
          tamanho="md"
        />
      </div>
    </div>

    <!-- Formulário em Blocos / Abas -->
    <div class="p-6 md:p-8 space-y-8">
      <div
        v-for="grupo in gruposIndicadores"
        :key="grupo.titulo"
        class="space-y-3"
      >
        <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-600"></span>
          <span>{{ grupo.titulo }}</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="codigo in grupo.codigos"
            :key="codigo"
            :class="[
              'p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-2',
              estadoIndicadores[codigo].ativo
                ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400 shadow-sm'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
            ]"
            @click="alternarIndicador(codigo)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-0.5">
                <p class="text-sm font-semibold text-slate-900 leading-snug">
                  {{ METADADOS_INDICADORES[codigo].descricao }}
                </p>
                <span class="text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md inline-block">
                  Peso: +{{ METADADOS_INDICADORES[codigo].pesoPadrao }} pts
                </span>
              </div>

              <!-- Checkbox estilizado acessível via @nuxt/icon -->
              <div
                :class="[
                  'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                  estadoIndicadores[codigo].ativo
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-300 text-transparent'
                ]"
              >
                <Icon name="lucide:check" class="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            <!-- Campo opcional para nome do membro afetado (ex: quem é o acamado) -->
            <div
              v-if="estadoIndicadores[codigo].ativo"
              class="pt-1.5 border-t border-blue-200/60"
              @click.stop
            >
              <input
                v-model="estadoIndicadores[codigo].individuoNome"
                type="text"
                placeholder="Nome do morador afetado (opcional)..."
                class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Resumo da Explicabilidade Antes de Salvar -->
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div class="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Icon name="lucide:sparkles" class="w-4 h-4 text-amber-500" />
          <span>Regra de Decisão do Motor Clínico</span>
        </div>
        <p class="text-xs text-slate-600 font-medium">
          {{ calculoPreview.regraDecisao }}
        </p>
      </div>

      <!-- Barra de Ações Inferior -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          class="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          @click="emit('cancelar')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          @click="handleSalvar"
        >
          <Icon name="lucide:save" class="w-4 h-4" />
          <span>Salvar Estratificação Oficial</span>
        </button>
      </div>
    </div>
  </div>
</template>
