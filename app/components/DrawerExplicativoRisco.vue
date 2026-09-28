<script setup lang="ts">
import { computed } from 'vue'
import { PerfilProfissional } from '~~/shared/domain/risk-engine'
import type { AvaliacaoRiscoDoc } from '~~/shared/domain/schemas'
import BadgeRiscoFamiliar from '~/components/BadgeRiscoFamiliar.vue'
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

const abertoModel = computed({
  get: () => props.aberto,
  set: (val: boolean) => {
    if (!val) emit('fechar')
  }
})

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
  <!-- USlideover do Nuxt UI v4: Acessibilidade nativa, focus trap e dismiss suave via overlay e tecla Esc -->
  <USlideover
    v-model:open="abertoModel"
    side="right"
    title="Explicação do risco familiar"
    description="Pontuação, indicadores e histórico da avaliação."
    :ui="{
      content: 'max-w-md w-full bg-default flex flex-col shadow-2xl',
      header: 'p-0',
      body: 'p-5 space-y-6 overflow-y-auto flex-1',
      footer: 'bg-muted border-t border-default p-4 flex items-center justify-between gap-3'
    }"
  >
    <template #header>
      <div class="bg-elevated px-5 py-4 text-default flex items-center justify-between gap-3 w-full">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <Icon :name="ICONES.escala" class="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            <h2 id="drawer-risco-titulo" class="text-base font-bold text-default">
              Explicação do Risco Familiar
            </h2>
          </div>
          <p v-if="nomeFamilia" class="text-xs text-muted mt-1 truncate">
            {{ nomeFamilia }} <span v-if="prontuario">· Prontuário {{ prontuario }}</span>
          </p>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          :icon="ICONES.fechar"
          aria-label="Fechar painel explicativo"
          class="text-muted hover:text-default hover:bg-elevated"
          @click="emit('fechar')"
        />
      </div>
    </template>

    <template #body>
      <div v-if="avaliacao" class="space-y-6">
        <!-- Classificação e regra de corte -->
        <section class="p-4 rounded-xl border border-default bg-muted space-y-3">
          <div class="flex items-center justify-between text-xs text-muted">
            <span class="font-bold uppercase tracking-wider text-[10px]">Classificação Obtida</span>
            <span class="text-[11px] font-semibold text-muted">Escala: {{ avaliacao.versaoEscala }}</span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <p>
              <span class="text-3xl font-black text-highlighted">{{ avaliacao.pontuacaoTotal }}</span>
              <span class="text-xs text-muted ml-1 font-semibold">pontos</span>
            </p>
            <BadgeRiscoFamiliar :classificacao="avaliacao.classificacao" :interativo="false" />
          </div>

          <div class="p-3 bg-default rounded-lg border border-default text-xs text-default font-medium flex items-start gap-2">
            <Icon :name="ICONES.regraDecisao" class="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>{{ avaliacao.regraDecisao }}</span>
          </div>
        </section>

        <!-- Fatores pontuados -->
        <section>
          <h3 class="text-xs font-extrabold text-default uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Condições que Pontuaram</span>
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ avaliacao.fatoresDeterminantes.length }}
            </UBadge>
          </h3>

          <div
            v-if="avaliacao.fatoresDeterminantes.length === 0"
            class="p-4 rounded-xl bg-green-50 border border-green-200 text-green-900 text-xs flex items-center gap-2"
          >
            <Icon :name="ICONES.registroConfirmado" class="w-5 h-5 shrink-0 text-green-700" aria-hidden="true" />
            <span>Nenhuma condição de vulnerabilidade pontuada nesta visita.</span>
          </div>

          <ul v-else class="divide-y divide-default border border-default rounded-xl overflow-hidden bg-default">
            <li
              v-for="item in avaliacao.fatoresDeterminantes"
              :key="item.indicadorCodigo"
              class="p-3.5 flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-3 min-w-0">
                <Icon :name="ICONES_INDICADOR[item.indicadorCodigo]" class="w-6 h-6 text-toned shrink-0" aria-hidden="true" />
                <div class="min-w-0">
                  <p class="text-xs font-bold text-highlighted leading-snug">{{ item.descricao }}</p>
                  <p v-if="item.individuoId" class="text-[11px] text-muted">
                    Membro associado (ver prontuário)
                  </p>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded text-xs font-black bg-primary/10 text-primary border border-primary/30 shrink-0">
                +{{ item.pontuacaoAtribuida }} pts
              </span>
            </li>
          </ul>
        </section>

        <!-- Indicadores coletados sem peso nesta versão da escala -->
        <section v-if="naoPontuados.length > 0">
          <h3 class="text-xs font-extrabold text-default uppercase tracking-wider mb-2">
            Variáveis de Pesquisa (Não Pontuadas)
          </h3>
          <ul class="space-y-1.5 bg-muted p-3 rounded-xl border border-default">
            <li
              v-for="item in naoPontuados"
              :key="item.indicadorCodigo"
              class="flex items-center gap-2 text-xs text-toned"
            >
              <Icon :name="ICONES_INDICADOR[item.indicadorCodigo]" class="w-4 h-4 shrink-0 text-muted" aria-hidden="true" />
              <span>{{ item.descricao }} — sem peso nesta versão</span>
            </li>
          </ul>
        </section>

        <!-- Delta em relação à avaliação anterior -->
        <section v-if="delta" class="p-4 rounded-xl border border-default bg-muted space-y-3">
          <h3 class="text-[10px] font-extrabold text-muted uppercase tracking-wider">
            Comparativo com Avaliação Anterior ({{ formatarData(delta.dataAvaliacaoAnterior) }})
          </h3>

          <div>
            <span
              v-if="delta.evolucaoRisco === 'AGRAVAMENTO'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-900 border border-red-200"
            >
              <Icon :name="ICONES.agravamento" class="w-3.5 h-3.5" aria-hidden="true" />
              Agravamento (+{{ delta.variacaoPontos }} pts)
            </span>
            <span
              v-else-if="delta.evolucaoRisco === 'MELHORIA'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-900 border border-green-200"
            >
              <Icon :name="ICONES.melhoria" class="w-3.5 h-3.5" aria-hidden="true" />
              Melhoria ({{ delta.variacaoPontos }} pts)
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-200 text-highlighted border border-slate-300"
            >
              <Icon :name="ICONES.estavel" class="w-3.5 h-3.5" aria-hidden="true" />
              Estável ({{ delta.variacaoPontos >= 0 ? '+' : '' }}{{ delta.variacaoPontos }} pts)
            </span>
          </div>

          <div v-if="delta.fatoresAdicionados.length > 0" class="text-xs text-red-900 bg-red-50 p-2.5 rounded-lg border border-red-200">
            <p class="font-bold mb-1">Novas condições identificadas:</p>
            <ul class="list-disc list-inside space-y-0.5">
              <li v-for="f in delta.fatoresAdicionados" :key="f.indicadorCodigo">
                {{ f.descricao }} (+{{ f.pontuacaoAtribuida }} pts)
              </li>
            </ul>
          </div>

          <div v-if="delta.fatoresResolvidos.length > 0" class="text-xs text-green-900 bg-green-50 p-2.5 rounded-lg border border-green-200">
            <p class="font-bold mb-1">Condições superadas/resolvidas:</p>
            <ul class="list-disc list-inside space-y-0.5">
              <li v-for="f in delta.fatoresResolvidos" :key="f.indicadorCodigo">
                {{ f.descricao }} (−{{ f.pontuacaoAtribuida }} pts)
              </li>
            </ul>
          </div>
        </section>

        <!-- Autoria e histórico -->
        <section class="pt-2 border-t border-default text-xs text-muted space-y-1.5">
          <p class="flex items-center gap-1.5">
            <Icon :name="ICONES.avaliador" class="w-4 h-4 text-dimmed" aria-hidden="true" />
            <span>Avaliado por: <strong class="text-default">{{ autor }}</strong> em {{ formatarData(avaliacao.dataAvaliacao) }}</span>
          </p>
          <p v-if="totalAvaliacoes" class="flex items-center gap-1.5">
            <Icon :name="ICONES.calendario" class="w-4 h-4 text-dimmed" aria-hidden="true" />
            <span>{{ totalAvaliacoes }} {{ totalAvaliacoes === 1 ? 'avaliação registrada' : 'avaliações registradas' }} (histórico preservado)</span>
          </p>
        </section>
      </div>

      <div v-else class="p-8 text-center text-muted space-y-2">
        <Icon :name="ICONES.vazio" class="w-8 h-8 text-dimmed mx-auto" aria-hidden="true" />
        <p class="font-bold text-toned">Esta família ainda não tem avaliação registrada.</p>
      </div>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        label="Fechar"
        @click="emit('fechar')"
      />
      <UButton
        color="primary"
        label="Registrar Nova Avaliação"
        :icon="ICONES.salvar"
        @click="emit('reavaliar')"
      />
    </template>
  </USlideover>
</template>
