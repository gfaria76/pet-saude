<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  calcularEstratificacaoRisco,
  CONFIGURACAO_COELHO_SAVASSI_V1,
  IndicadorRiscoCodigo,
  METADADOS_INDICADORES,
  type ContextoAvaliacao
} from '~~/shared/domain/risk-engine'
import { useFamilias, AVALIADOR_DEMO } from '~/composables/useFamilias'
import { ICONES } from '~/utils/icones'
import { ICONES_INDICADOR } from '~/utils/iconesIndicador'
import BadgeRiscoFamiliar from '~/components/BadgeRiscoFamiliar.vue'

definePageMeta({
  layout: 'campo'
})

const route = useRoute()
const router = useRouter()
const familiaId = computed(() => String(route.params.id))

const {
  obterFamiliaPorId,
  obterAvaliacaoAnterior,
  salvarNovaAvaliacao
} = useFamilias()

const familia = computed(() => obterFamiliaPorId(familiaId.value))
const avaliacaoAnterior = computed(() => obterAvaliacaoAnterior(familiaId.value))

// Contexto fixado na abertura do formulário
const contexto = ref<ContextoAvaliacao>({
  dataAvaliacao: new Date().toISOString(),
  avaliadorId: AVALIADOR_DEMO.id,
  avaliadorPerfil: AVALIADOR_DEMO.perfil
})

// Conjunto de indicadores selecionados
const marcados = ref<Set<IndicadorRiscoCodigo>>(new Set())

// Grupos estruturais conforme o Relatório Técnico
const gruposIndicadores: Array<{ titulo: string; codigos: IndicadorRiscoCodigo[] }> = [
  {
    titulo: '1. Domicílio e Saneamento',
    codigos: [IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO, IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO]
  },
  {
    titulo: '2. Condições Sociais e Vulnerabilidade',
    codigos: [IndicadorRiscoCodigo.IND_DESEMPREGO, IndicadorRiscoCodigo.IND_DROGADICAO, IndicadorRiscoCodigo.IND_ANALFABETISMO]
  },
  {
    titulo: '3. Saúde e Limitações Físicas',
    codigos: [
      IndicadorRiscoCodigo.IND_ACAMADO,
      IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA,
      IndicadorRiscoCodigo.IND_DEFICIENCIA_MENTAL,
      IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE,
      IndicadorRiscoCodigo.IND_HIPERTENSAO,
      IndicadorRiscoCodigo.IND_DIABETES
    ]
  },
  {
    titulo: '4. Faixas Etárias de Risco',
    codigos: [IndicadorRiscoCodigo.IND_MENOR_6_MESES, IndicadorRiscoCodigo.IND_MAIOR_70_ANOS]
  }
]

const escala = CONFIGURACAO_COELHO_SAVASSI_V1

const rotuloPeso = (codigo: IndicadorRiscoCodigo) => {
  const peso = escala.pesos[codigo]
  return peso === null ? 'Não pontuado' : `+${peso} pts`
}

// Cálculo determinístico em tempo real via motor puro de domínio
const calculoPreview = computed(() =>
  calcularEstratificacaoRisco(
    {
      familiaId: familiaId.value,
      indicadores: Object.values(IndicadorRiscoCodigo).map(codigo => ({
        codigo,
        ativo: marcados.value.has(codigo)
      })),
      avaliacaoAnterior: avaliacaoAnterior.value
    },
    contexto.value,
    escala
  )
)

function alternarIndicador(codigo: IndicadorRiscoCodigo) {
  const proximo = new Set(marcados.value)
  if (proximo.has(codigo)) {
    proximo.delete(codigo)
  } else {
    proximo.add(codigo)
  }
  marcados.value = proximo
}

function submeter() {
  if (!familia.value) return

  // Salva no estado imutável
  salvarNovaAvaliacao(calculoPreview.value)

  // Redireciona para o dossiê da família
  router.push(`/familias/${familia.value.id}`)
}
</script>

<template>
  <div v-if="familia" class="space-y-6">
    
    <!-- Barra Superior Fixa com Prévia em Tempo Real -->
    <div class="sticky top-16 z-20 bg-default text-default p-4 sm:p-5 rounded-2xl shadow-xl flex items-center justify-between gap-4 border border-default">
      <div>
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs font-bold text-primary">
            {{ familia.prontuarioFamiliar }}
          </span>
          <span class="text-xs text-dimmed">· Microárea {{ familia.microareaId }}</span>
        </div>
        <h1 class="text-lg sm:text-xl font-black text-default truncate mt-0.5">
          {{ familia.responsavelNome }}
        </h1>
        <p class="text-[11px] text-dimmed">
          Avaliador: {{ AVALIADOR_DEMO.nome }} · Escala {{ escala.versao }}
        </p>
      </div>

      <!-- Placar da Prévia Instantânea -->
      <div class="bg-elevated border border-default rounded-xl p-3 sm:p-3.5 flex items-center gap-3 shrink-0" aria-live="polite">
        <div class="text-right">
          <span class="text-[10px] uppercase tracking-wider text-dimmed font-bold block">Prévia</span>
          <span class="text-2xl font-black text-default">{{ calculoPreview.pontuacaoTotal }}</span>
          <span class="text-[10px] text-dimmed"> pts</span>
        </div>
        <BadgeRiscoFamiliar :classificacao="calculoPreview.classificacao" :interativo="false" tamanho="sm" />
      </div>
    </div>

    <!-- Regra de Decisão Atualizada Dinamicamente com UAlert -->
    <UAlert
      :icon="ICONES.regraDecisao"
      color="primary"
      variant="subtle"
      :title="`Regra aplicada: ${calculoPreview.regraDecisao}`"
      :ui="{
        root: 'rounded-xl border border-primary/30 bg-primary/10 text-blue-950 text-xs font-medium',
        title: 'text-xs font-medium text-blue-950',
        icon: 'w-4 h-4 text-primary'
      }"
    />

    <!-- Formulário com Grupos de Sentinelas (Alvos de Toque Largos de 56px) -->
    <form class="space-y-6" @submit.prevent="submeter">
      <div
        v-for="grupo in gruposIndicadores"
        :key="grupo.titulo"
        class="bg-default rounded-2xl border border-default p-5 shadow-xs space-y-3"
      >
        <h2 class="text-xs font-extrabold text-default uppercase tracking-wider border-b border-default pb-2">
          {{ grupo.titulo }}
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            v-for="codigo in grupo.codigos"
            :key="codigo"
            :class="[
              'p-4 min-h-[56px] rounded-xl border cursor-pointer select-none flex items-center gap-3.5 transition-all',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-700',
              marcados.has(codigo)
                ? 'bg-primary/10 border-blue-500 ring-2 ring-blue-500 shadow-xs'
                : 'bg-muted border-default hover:bg-elevated'
            ]"
          >
            <input
              type="checkbox"
              class="sr-only"
              :checked="marcados.has(codigo)"
              @change="alternarIndicador(codigo)"
            />

            <!-- Ícone Oficial Health Icons -->
            <Icon
              :name="ICONES_INDICADOR[codigo]"
              class="w-7 h-7 text-toned shrink-0"
              aria-hidden="true"
            />

            <!-- Descrição e Pontuação -->
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-bold text-highlighted leading-snug">
                {{ METADADOS_INDICADORES[codigo].descricao }}
              </span>
              <span class="text-xs font-black text-blue-800">
                {{ rotuloPeso(codigo) }}
              </span>
            </span>

            <!-- Caixa de Seleção Visual -->
            <span
              :class="[
                'w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors',
                marcados.has(codigo)
                  ? 'bg-primary border-primary text-inverted'
                  : 'bg-default border-slate-400 text-transparent'
              ]"
              aria-hidden="true"
            >
              <Icon :name="ICONES.marcado" class="w-4 h-4" />
            </span>
          </label>
        </div>
      </div>

      <!-- Barra de Ações com UButton do Nuxt UI v4 -->
      <div class="bg-default p-5 rounded-2xl border border-default shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <UButton
          :to="`/familias/${familia.id}`"
          color="neutral"
          variant="outline"
          size="lg"
          label="Cancelar"
          class="font-semibold"
        />

        <UButton
          type="submit"
          color="primary"
          size="xl"
          :icon="ICONES.salvar"
          label="Salvar e Registrar Avaliação de Campo"
          class="font-black shadow-lg"
        />
      </div>
    </form>

  </div>

  <div v-else class="p-12 text-center text-muted bg-default rounded-2xl border border-default">
    <Icon :name="ICONES.vazio" class="w-8 h-8 text-dimmed mx-auto mb-2" aria-hidden="true" />
    <h2 class="text-base font-bold text-default">Família não encontrada</h2>
    <UButton to="/familias" color="primary" label="Voltar para Lista" class="mt-4" />
  </div>
</template>
