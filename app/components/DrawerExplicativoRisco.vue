<script setup lang="ts">
import { computed } from 'vue'
import {
  type ResultadoEstratificacaoRisco,
  FaixaRisco,
  ROTULOS_FAIXA_RISCO
} from '~~/shared/domain/risk-engine'

const props = defineProps<{
  aberto: boolean
  avaliacao: ResultadoEstratificacaoRisco | null
  nomeFamilia?: string
  prontuario?: string
}>()

const emit = defineEmits<{
  (e: 'fechar'): void
  (e: 'reavaliar'): void
}>()

const infoFaixa = computed(() => {
  if (!props.avaliacao) return null
  return ROTULOS_FAIXA_RISCO[props.avaliacao.classificacao]
})

const dataFormatada = computed(() => {
  if (!props.avaliacao?.dataAvaliacao) return 'Data não informada'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(props.avaliacao.dataAvaliacao))
  } catch {
    return props.avaliacao.dataAvaliacao
  }
})

const delta = computed(() => props.avaliacao?.comparativoAvaliacaoAnterior)
</script>

<template>
  <div
    v-if="aberto"
    class="fixed inset-0 z-50 overflow-hidden"
    aria-labelledby="slide-over-title"
    role="dialog"
    aria-modal="true"
  >
    <!-- Backdrop com opacidade e blur leve -->
    <div
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
      @click="emit('fechar')"
    />

    <div class="fixed inset-y-0 right-0 flex max-w-full pl-10">
      <div class="w-screen max-w-md transform bg-white shadow-2xl transition-all flex flex-col">
        
        <!-- Cabeçalho da Gaveta -->
        <div class="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <Icon name="lucide:shield-check" class="w-5 h-5 text-blue-400" />
              <h2 id="slide-over-title" class="text-base font-semibold">
                Explicabilidade do Risco Familiar
              </h2>
            </div>
            <p v-if="nomeFamilia" class="text-xs text-slate-300 mt-1">
              {{ nomeFamilia }} <span v-if="prontuario">· Prontuário #{{ prontuario }}</span>
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
            @click="emit('fechar')"
          >
            <span class="sr-only">Fechar painel</span>
            <Icon name="lucide:x" class="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Conteúdo Rolável -->
        <div v-if="avaliacao" class="flex-1 overflow-y-auto p-6 space-y-6">
          
          <!-- Card de Classificação Consolidada -->
          <div class="p-4 rounded-xl border bg-slate-50 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Classificação Oficial
              </span>
              <span class="text-xs text-slate-500">
                Escala: {{ avaliacao.versaoEscala }}
              </span>
            </div>

            <div class="flex items-baseline justify-between">
              <div>
                <span class="text-2xl font-black text-slate-900">
                  {{ avaliacao.pontuacaoTotal }}
                </span>
                <span class="text-sm text-slate-500 ml-1">pontos</span>
              </div>
              <BadgeRiscoFamiliar
                :classificacao="avaliacao.classificacao"
                :pontuacao="avaliacao.pontuacaoTotal"
                :interativo="false"
                tamanho="md"
              />
            </div>

            <!-- Regra de Decisão Explicada -->
            <div class="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 font-medium">
              💡 {{ avaliacao.regraDecisao }}
            </div>
          </div>

          <!-- Decomposição de Itens / Indicadores Pontuados -->
          <div>
            <h3 class="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Condições Sentinelas Identificadas</span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {{ avaliacao.fatoresDeterminantes.length }} ativas
              </span>
            </h3>

            <div v-if="avaliacao.fatoresDeterminantes.length === 0" class="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <Icon name="lucide:file-check-2" class="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Nenhuma condição de vulnerabilidade foi registrada nesta avaliação.</span>
            </div>

            <ul v-else class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <li
                v-for="item in avaliacao.fatoresDeterminantes"
                :key="item.indicadorCodigo"
                class="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/80 transition-colors"
              >
                <div class="space-y-0.5">
                  <p class="text-sm font-semibold text-slate-800">
                    {{ item.descricao }}
                  </p>
                  <p v-if="item.individuoNome" class="text-xs text-slate-500">
                    Membro: <span class="font-medium text-slate-700">{{ item.individuoNome }}</span>
                  </p>
                  <span class="inline-block text-[11px] font-medium text-slate-400">
                    Tipo: {{ item.tipoSentinela }}
                  </span>
                </div>
                <span class="inline-flex items-center px-2 py-1 rounded text-xs font-extrabold bg-slate-100 text-slate-800 shrink-0">
                  +{{ item.pontuacaoAtribuida }} pts
                </span>
              </li>
            </ul>
          </div>

          <!-- Comparativo Histórico / Delta -->
          <div v-if="delta" class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>Evolução em Relação à Avaliação Anterior</span>
            </h4>

            <div class="flex items-center gap-2">
              <span
                v-if="delta.evolucaoRisco === 'AGRAVAMENTO'"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800"
              >
                <Icon name="lucide:trending-up" class="w-3.5 h-3.5" />
                Agravamento (+{{ delta.variacaoPontos }} pts)
              </span>
              <span
                v-else-if="delta.evolucaoRisco === 'MELHORIA'"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"
              >
                <Icon name="lucide:trending-down" class="w-3.5 h-3.5" />
                Melhoria ({{ delta.variacaoPontos }} pts)
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800"
              >
                <Icon name="lucide:minus" class="w-3.5 h-3.5" />
                Estável (Sem variação de pontuação)
              </span>
            </div>

            <!-- Fatores novos adicionados -->
            <div v-if="delta.fatoresAdicionados.length > 0" class="text-xs text-red-800 bg-red-50 p-2.5 rounded-lg border border-red-200">
              <p class="font-bold mb-1">Novas vulnerabilidades detectadas:</p>
              <ul class="list-disc list-inside space-y-0.5">
                <li v-for="f in delta.fatoresAdicionados" :key="f.indicadorCodigo">
                  {{ f.descricao }} (+{{ f.pontuacaoAtribuida }} pts)
                </li>
              </ul>
            </div>

            <!-- Fatores resolvidos -->
            <div v-if="delta.fatoresResolvidos.length > 0" class="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              <p class="font-bold mb-1">Vulnerabilidades resolvidas/afastadas:</p>
              <ul class="list-disc list-inside space-y-0.5">
                <li v-for="f in delta.fatoresResolvidos" :key="f.indicadorCodigo">
                  {{ f.descricao }} (-{{ f.pontuacaoAtribuida }} pts)
                </li>
              </ul>
            </div>
          </div>

          <!-- Metadados de Auditoria e Data -->
          <div class="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
            <div class="flex items-center gap-1.5">
              <Icon name="lucide:calendar" class="w-3.5 h-3.5 text-slate-400" />
              <span>Realizada em: {{ dataFormatada }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <Icon name="lucide:user" class="w-3.5 h-3.5 text-slate-400" />
              <span>Avaliador: ACS / Profissional de Saúde Autorizado</span>
            </div>
          </div>

        </div>

        <!-- Rodapé da Gaveta com Ações -->
        <div class="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3">
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            @click="emit('fechar')"
          >
            Fechar
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            @click="emit('reavaliar')"
          >
            <span>Registrar Nova Avaliação</span>
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
