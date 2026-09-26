<script setup lang="ts">
import { computed } from 'vue'
import { PerfilProfissional } from '~~/shared/domain/risk-engine'
import type { AvaliacaoRiscoDoc } from '~~/shared/domain/schemas'
import { ICONES } from '~/utils/icones'
import { ICONES_INDICADOR } from '~/utils/iconesIndicador'

const props = defineProps<{
  aberto: boolean
  avaliacao: AvaliacaoRiscoDoc | null
  totalAvaliacoes?: number
  nomeFamilia?: string
  prontuario?: string
}>()

const emit = defineEmits<{
  (e: 'fechar'): void
  (e: 'reavaliar'): void
}>()

const ROTULO_PERFIL: Record<PerfilProfissional, string> = {
  [PerfilProfissional.ACS]: 'ACS',
  [PerfilProfissional.ENFERMEIRO]: 'Enfermagem',
  [PerfilProfissional.MEDICO]: 'Medicina',
  [PerfilProfissional.TECNICO_ENFERMAGEM]: 'Técnico(a) de Enfermagem',
  [PerfilProfissional.CIRURGIAO_DENTISTA]: 'Odontologia',
  [PerfilProfissional.COORDENADOR_APS]: 'Coordenação APS',
  [PerfilProfissional.ADMIN]: 'Administração'
}

const formatarData = (iso?: string) => {
  if (!iso) return 'data não informada'
  const data = new Date(iso)
  return Number.isNaN(data.getTime())
    ? iso
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data)
}

const autor = computed(() => {
  if (!props.avaliacao) return ''
  return `${ROTULO_PERFIL[props.avaliacao.avaliadorPerfil]} ${props.avaliacao.avaliadorNome}`
})

const delta = computed(() => props.avaliacao?.comparativoAvaliacaoAnterior)
const naoPontuados = computed(() => props.avaliacao?.indicadoresNaoPontuados ?? [])
</script>

<template>
  <div
    v-if="aberto"
    class="fixed inset-0 z-50 overflow-hidden"
    aria-labelledby="drawer-risco-titulo"
    role="dialog"
    aria-modal="true"
    @keydown.esc="emit('fechar')"
  >
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" @click="emit('fechar')" />

    <div class="fixed inset-y-0 right-0 flex max-w-full sm:pl-10">
      <div class="w-screen max-w-md bg-white shadow-2xl flex flex-col">

        <!-- Cabeçalho -->
        <div class="bg-slate-900 px-5 py-4 text-white flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <Icon :name="ICONES.escala" class="w-5 h-5 text-blue-300 shrink-0" aria-hidden="true" />
              <h2 id="drawer-risco-titulo" class="text-base font-semibold">
                Explicação do Risco Familiar
              </h2>
            </div>
            <p v-if="nomeFamilia" class="text-xs text-slate-300 mt-1 truncate">
              {{ nomeFamilia }} <span v-if="prontuario">· Prontuário {{ prontuario }}</span>
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            @click="emit('fechar')"
          >
            <span class="sr-only">Fechar painel</span>
            <Icon :name="ICONES.fechar" class="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Conteúdo -->
        <div v-if="avaliacao" class="flex-1 overflow-y-auto p-5 space-y-6">

          <!-- Classificação e regra de corte -->
          <section class="p-4 rounded-xl border bg-slate-50 space-y-3">
            <div class="flex items-center justify-between text-xs text-slate-600">
              <span class="font-semibold uppercase tracking-wider">Classificação</span>
              <span>Escala: {{ avaliacao.versaoEscala }}</span>
            </div>

            <div class="flex items-center justify-between gap-3">
              <p>
                <span class="text-3xl font-black text-slate-900">{{ avaliacao.pontuacaoTotal }}</span>
                <span class="text-sm text-slate-600 ml-1">pontos</span>
              </p>
              <BadgeRiscoFamiliar :classificacao="avaliacao.classificacao" :interativo="false" />
            </div>

            <p class="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 font-medium flex gap-2">
              <Icon :name="ICONES.regraDecisao" class="w-4 h-4 text-slate-500 shrink-0 mt-px" aria-hidden="true" />
              <span>{{ avaliacao.regraDecisao }}</span>
            </p>
          </section>

          <!-- Fatores pontuados -->
          <section>
            <h3 class="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Condições que pontuaram</span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                {{ avaliacao.fatoresDeterminantes.length }}
              </span>
            </h3>

            <p
              v-if="avaliacao.fatoresDeterminantes.length === 0"
              class="p-4 rounded-lg bg-green-50 border border-green-200 text-green-900 text-sm flex items-center gap-2"
            >
              <Icon :name="ICONES.registroConfirmado" class="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Nenhuma condição de vulnerabilidade registrada nesta avaliação.</span>
            </p>

            <ul v-else class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              <li
                v-for="item in avaliacao.fatoresDeterminantes"
                :key="item.indicadorCodigo"
                class="p-3.5 flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <Icon :name="ICONES_INDICADOR[item.indicadorCodigo]" class="w-7 h-7 text-slate-700 shrink-0" aria-hidden="true" />
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-900">{{ item.descricao }}</p>
                    <p v-if="item.individuoId" class="text-xs text-slate-600">
                      Membro da família (ver prontuário)
                    </p>
                  </div>
                </div>
                <span class="px-2 py-1 rounded text-xs font-extrabold bg-slate-100 text-slate-900 shrink-0">
                  +{{ item.pontuacaoAtribuida }} pts
                </span>
              </li>
            </ul>
          </section>

          <!-- Indicadores coletados sem peso nesta versão da escala -->
          <section v-if="naoPontuados.length > 0">
            <h3 class="text-sm font-bold text-slate-900 mb-2">Registrados, sem pontuação nesta versão da escala</h3>
            <ul class="space-y-1.5">
              <li
                v-for="item in naoPontuados"
                :key="item.indicadorCodigo"
                class="flex items-center gap-2 text-sm text-slate-700"
              >
                <Icon :name="ICONES_INDICADOR[item.indicadorCodigo]" class="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{{ item.descricao }} — não pontuado</span>
              </li>
            </ul>
          </section>

          <!-- Delta em relação à avaliação anterior -->
          <section v-if="delta" class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Em relação à avaliação de {{ formatarData(delta.dataAvaliacaoAnterior) }}
            </h3>

            <span
              v-if="delta.evolucaoRisco === 'AGRAVAMENTO'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900"
            >
              <Icon :name="ICONES.agravamento" class="w-3.5 h-3.5" aria-hidden="true" />
              Agravamento (+{{ delta.variacaoPontos }} pts)
            </span>
            <span
              v-else-if="delta.evolucaoRisco === 'MELHORIA'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-900"
            >
              <Icon :name="ICONES.melhoria" class="w-3.5 h-3.5" aria-hidden="true" />
              Melhoria ({{ delta.variacaoPontos }} pts)
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-900"
            >
              <Icon :name="ICONES.estavel" class="w-3.5 h-3.5" aria-hidden="true" />
              Estável ({{ delta.variacaoPontos >= 0 ? '+' : '' }}{{ delta.variacaoPontos }} pts)
            </span>

            <div v-if="delta.fatoresAdicionados.length > 0" class="text-xs text-red-900 bg-red-50 p-2.5 rounded-lg border border-red-200">
              <p class="font-bold mb-1">Novas condições:</p>
              <ul class="list-disc list-inside space-y-0.5">
                <li v-for="f in delta.fatoresAdicionados" :key="f.indicadorCodigo">
                  {{ f.descricao }} (+{{ f.pontuacaoAtribuida }} pts)
                </li>
              </ul>
            </div>

            <div v-if="delta.fatoresResolvidos.length > 0" class="text-xs text-green-900 bg-green-50 p-2.5 rounded-lg border border-green-200">
              <p class="font-bold mb-1">Condições que deixaram de existir:</p>
              <ul class="list-disc list-inside space-y-0.5">
                <li v-for="f in delta.fatoresResolvidos" :key="f.indicadorCodigo">
                  {{ f.descricao }} (−{{ f.pontuacaoAtribuida }} pts)
                </li>
              </ul>
            </div>
          </section>

          <!-- Autoria e histórico -->
          <section class="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
            <p class="flex items-center gap-1.5">
              <Icon :name="ICONES.avaliador" class="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Avaliado por: <strong class="text-slate-800">{{ autor }}</strong> em {{ formatarData(avaliacao.dataAvaliacao) }}</span>
            </p>
            <p v-if="totalAvaliacoes" class="flex items-center gap-1.5">
              <Icon :name="ICONES.calendario" class="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>{{ totalAvaliacoes }} {{ totalAvaliacoes === 1 ? 'avaliação registrada' : 'avaliações registradas' }} (histórico preservado)</span>
            </p>
          </section>
        </div>

        <div v-else class="flex-1 p-6 text-sm text-slate-600 flex flex-col items-center justify-center gap-2 text-center">
          <Icon :name="ICONES.vazio" class="w-8 h-8 text-slate-400" aria-hidden="true" />
          <p>Esta família ainda não tem avaliação registrada.</p>
        </div>

        <!-- Ações -->
        <div class="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3">
          <button
            type="button"
            class="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
            @click="emit('fechar')"
          >
            Fechar
          </button>
          <button
            type="button"
            class="px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-sm cursor-pointer"
            @click="emit('reavaliar')"
          >
            Registrar nova avaliação
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
