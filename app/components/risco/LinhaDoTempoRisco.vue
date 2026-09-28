<script setup lang="ts">
import { computed } from 'vue'
import { PerfilProfissional } from '~~/shared/domain/risk-engine'
import type { AvaliacaoRiscoDoc } from '~~/shared/domain/schemas'
import BadgeRiscoFamiliar from '~/components/BadgeRiscoFamiliar.vue'
import { ICONES } from '~/utils/icones'
import { ICONES_INDICADOR } from '~/utils/iconesIndicador'

const props = defineProps<{
  avaliacoes: AvaliacaoRiscoDoc[]
}>()

const emit = defineEmits<{
  (e: 'abrirDetalhes', avaliacao: AvaliacaoRiscoDoc): void
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

// Histórico da mais recente para a mais antiga na visualização
const avaliacoesOrdenadas = computed(() => {
  return [...props.avaliacoes].reverse()
})

function formatarData(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between border-b border-default pb-3">
      <div>
        <h3 class="text-base font-bold text-highlighted flex items-center gap-2">
          <Icon :name="ICONES.calendario" class="w-5 h-5 text-primary" aria-hidden="true" />
          <span>Linha do Tempo Longitudinal de Risco</span>
        </h3>
        <p class="text-xs text-muted mt-0.5">
          Histórico imutável (append-only) de estratificações realizadas pelas equipes de saúde.
        </p>
      </div>

      <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-elevated text-default border border-default">
        {{ avaliacoes.length }} {{ avaliacoes.length === 1 ? 'avaliação' : 'avaliações' }}
      </span>
    </div>

    <!-- Lista de Avaliações em Linha do Tempo -->
    <div v-if="avaliacoesOrdenadas.length > 0" class="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      
      <div
        v-for="(aval, index) in avaliacoesOrdenadas"
        :key="aval.id ?? index"
        class="relative bg-default rounded-2xl border border-default p-5 shadow-xs transition-shadow hover:shadow-md"
      >
        <!-- Ponto indicador na linha -->
        <span
          class="absolute -left-6 sm:-left-8 top-5 w-6 h-6 rounded-full bg-primary border-4 border-default flex items-center justify-center text-inverted text-[10px] font-bold shadow-xs"
          aria-hidden="true"
        >
          {{ avaliacoesOrdenadas.length - index }}
        </span>

        <!-- Cabeçalho do Card da Avaliação -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-default">
          <div class="flex items-center gap-3 flex-wrap">
            <BadgeRiscoFamiliar
              :classificacao="aval.classificacao"
              :pontuacao="aval.pontuacaoTotal"
              :interativo="false"
              tamanho="sm"
            />
            <span v-if="index === 0" class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              Mais Recente
            </span>
          </div>

          <div class="text-xs text-muted flex items-center gap-1.5">
            <Icon :name="ICONES.calendario" class="w-4 h-4 text-dimmed" aria-hidden="true" />
            <span>{{ formatarData(aval.dataAvaliacao) }}</span>
          </div>
        </div>

        <!-- Delta Comparativo com a Avaliação Anterior -->
        <div
          v-if="aval.comparativoAvaliacaoAnterior"
          class="mt-3 p-3 rounded-xl bg-muted border border-default text-xs space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="font-bold text-toned uppercase tracking-wider text-[11px]">
              Evolução em Relação à Avaliação Anterior:
            </span>

            <span
              v-if="aval.comparativoAvaliacaoAnterior.evolucaoRisco === 'AGRAVAMENTO'"
              class="inline-flex items-center gap-1 font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md"
            >
              <Icon :name="ICONES.agravamento" class="w-3.5 h-3.5" aria-hidden="true" />
              Agravamento (+{{ aval.comparativoAvaliacaoAnterior.variacaoPontos }} pts)
            </span>
            <span
              v-else-if="aval.comparativoAvaliacaoAnterior.evolucaoRisco === 'MELHORIA'"
              class="inline-flex items-center gap-1 font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md"
            >
              <Icon :name="ICONES.melhoria" class="w-3.5 h-3.5" aria-hidden="true" />
              Melhoria ({{ aval.comparativoAvaliacaoAnterior.variacaoPontos }} pts)
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 font-bold text-toned bg-slate-200 px-2 py-0.5 rounded-md"
            >
              <Icon :name="ICONES.estavel" class="w-3.5 h-3.5" aria-hidden="true" />
              Estável ({{ aval.comparativoAvaliacaoAnterior.variacaoPontos >= 0 ? '+' : '' }}{{ aval.comparativoAvaliacaoAnterior.variacaoPontos }} pts)
            </span>
          </div>

          <div v-if="aval.comparativoAvaliacaoAnterior.fatoresAdicionados.length > 0" class="text-red-800">
            <span class="font-bold">Condições adicionadas:</span>
            {{ aval.comparativoAvaliacaoAnterior.fatoresAdicionados.map(f => f.descricao).join(', ') }}
          </div>

          <div v-if="aval.comparativoAvaliacaoAnterior.fatoresResolvidos.length > 0" class="text-green-800">
            <span class="font-bold">Condições resolvidas:</span>
            {{ aval.comparativoAvaliacaoAnterior.fatoresResolvidos.map(f => f.descricao).join(', ') }}
          </div>
        </div>

        <!-- Fatores que Pontuaram -->
        <div class="mt-3">
          <p class="text-xs font-bold text-toned uppercase tracking-wider mb-2">
            Condições Observadas nesta Visita ({{ aval.fatoresDeterminantes.length }}):
          </p>

          <div v-if="aval.fatoresDeterminantes.length === 0" class="text-xs text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200 flex items-center gap-2">
            <Icon :name="ICONES.registroConfirmado" class="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Nenhuma vulnerabilidade ou condição sentinela pontuada.</span>
          </div>

          <div v-else class="flex flex-wrap gap-2">
            <span
              v-for="item in aval.fatoresDeterminantes"
              :key="item.indicadorCodigo"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-elevated border border-default text-xs font-semibold text-default"
            >
              <Icon :name="ICONES_INDICADOR[item.indicadorCodigo]" class="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
              <span>{{ item.descricao }}</span>
              <span class="px-1.5 py-0.2 rounded bg-default text-[10px] font-black text-primary border border-default">
                +{{ item.pontuacaoAtribuida }}
              </span>
            </span>
          </div>
        </div>

        <!-- Rodapé do Card: Autoria e Escala -->
        <div class="mt-4 pt-3 border-t border-default flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted">
          <div class="flex items-center gap-2">
            <Icon :name="ICONES.avaliador" class="w-4 h-4 text-dimmed shrink-0" aria-hidden="true" />
            <span>
              Registrado por: <strong class="text-toned">{{ ROTULO_PERFIL[aval.avaliadorPerfil] }} {{ aval.avaliadorNome }}</strong>
            </span>
          </div>
          <span class="text-[11px] text-dimmed">
            Escala: {{ aval.versaoEscala }}
          </span>
        </div>

      </div>

    </div>

    <!-- Estado Vazio -->
    <div v-else class="p-8 text-center text-muted bg-default rounded-2xl border border-default">
      <Icon :name="ICONES.vazio" class="w-8 h-8 text-dimmed mx-auto mb-2" aria-hidden="true" />
      <p class="font-bold text-toned">Nenhuma avaliação registrada ainda para esta família.</p>
      <p class="text-xs text-muted mt-1">Realize a primeira estratificação para iniciar o monitoramento longitudinal.</p>
    </div>

  </div>
</template>
