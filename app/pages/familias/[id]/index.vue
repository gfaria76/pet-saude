<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFamilias } from '~/composables/useFamilias'
import { estiloFaixa } from '~/utils/estiloFaixaRisco'
import { ICONES } from '~/utils/icones'
import BadgeRiscoFamiliar from '~/components/BadgeRiscoFamiliar.vue'
import LinhaDoTempoRisco from '~/components/risco/LinhaDoTempoRisco.vue'
import ListaMembrosFamilia from '~/components/familia/ListaMembrosFamilia.vue'
import DadosDomicilioCard from '~/components/familia/DadosDomicilioCard.vue'

const route = useRoute()
const familiaId = computed(() => String(route.params.id))

const {
  obterFamiliaPorId,
  obterDomicilioPorId,
  obterIndividuosPorFamilia,
  obterHistoricoFamilia,
  abrirDrawerExplicativo
} = useFamilias()

const familia = computed(() => obterFamiliaPorId(familiaId.value))
const domicilio = computed(() => familia.value ? obterDomicilioPorId(familia.value.domicilioId) : null)
const membros = computed(() => obterIndividuosPorFamilia(familiaId.value))
const historico = computed(() => obterHistoricoFamilia(familiaId.value))

const estiloAtual = computed(() =>
  familia.value ? estiloFaixa(familia.value.ultimaClassificacaoRisco) : null
)

// Itens configurados para o UTabs do Nuxt UI v4
const itensAbas = computed(() => [
  {
    label: `Histórico Longitudinal (${historico.value.length})`,
    icon: ICONES.calendario,
    slot: 'historico'
  },
  {
    label: `Moradores (${membros.value.length})`,
    icon: ICONES.membros,
    slot: 'membros'
  },
  {
    label: 'Domicílio & Saneamento',
    icon: ICONES.domicilio,
    slot: 'domicilio'
  }
])
const breadcrumbItems = computed(() => [
  { label: 'Início', to: '/', icon: ICONES.app },
  { label: 'Famílias Adscritas', to: '/familias', icon: ICONES.familia },
  { label: `Prontuário ${familia.value?.prontuarioFamiliar ?? ''}`, icon: ICONES.prontuario }
])
</script>

<template>
  <div v-if="familia" class="space-y-6">
    <!-- Migalhas de Pão (Breadcrumb Nuxt UI v4) -->
    <UBreadcrumb :items="breadcrumbItems" class="text-xs" />

    <!-- Card Principal do Dossiê Familiar usando UCard do Nuxt UI v4 -->
    <UCard
      class="border border-default shadow-xs"
      :ui="{
        root: 'rounded-2xl bg-default',
        body: 'p-5 sm:p-6 space-y-6'
      }"
    >
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Identificação -->
        <div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="inline-flex items-center gap-1 font-mono text-xs font-bold text-default bg-elevated px-2.5 py-1 rounded-md border border-default">
              <Icon :name="ICONES.prontuario" class="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Prontuário {{ familia.prontuarioFamiliar }}</span>
            </span>
            <UBadge color="primary" variant="subtle" size="sm">
              Microárea {{ familia.microareaId }}
            </UBadge>
            <span class="text-xs text-muted capitalize">
              Equipe {{ familia.equipeId }} · {{ familia.municipioId === 'coxim' ? 'UBS Coxim (MS)' : 'UBS Corumbá (MS)' }}
            </span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-black text-highlighted tracking-tight mt-2">
            {{ familia.responsavelNome }}
          </h1>

          <p v-if="familia.contato" class="text-xs text-muted mt-1 flex items-center gap-1.5">
            <Icon :name="ICONES.telefone" class="w-4 h-4 text-dimmed" aria-hidden="true" />
            <span>Contato: <strong>{{ familia.contato }}</strong></span>
          </p>
        </div>

        <!-- Ação Primária de Reavaliação -->
        <div class="flex items-center gap-3">
          <UButton
            :to="`/familias/${familia.id}/avaliar`"
            color="primary"
            size="lg"
            :icon="ICONES.salvar"
            label="Nova Reavaliação de Campo"
            class="w-full sm:w-auto font-bold shadow-md"
          />
        </div>
      </div>

      <!-- Faixa Atual de Risco & Recomendação da APS -->
      <div v-if="estiloAtual" class="p-4 rounded-xl border border-default bg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <BadgeRiscoFamiliar
            :classificacao="familia.ultimaClassificacaoRisco"
            :pontuacao="familia.ultimaPontuacaoRisco"
            :interativo="true"
            tamanho="lg"
            @click="abrirDrawerExplicativo(familia)"
          />
          <div>
            <span class="text-[10px] font-extrabold text-muted uppercase tracking-wider block">Conduta de Gestão na APS:</span>
            <p class="text-xs font-semibold text-default">{{ estiloAtual.acaoRecomendada }}</p>
          </div>
        </div>

        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          label="Explicar Cálculo do Risco"
          class="self-start sm:self-auto font-bold"
          @click="abrirDrawerExplicativo(familia)"
        />
      </div>

      <!-- UTabs do Nuxt UI v4 com acessibilidade e transição integrada -->
      <UTabs
        :items="itensAbas"
        class="w-full"
        :ui="{
          list: 'bg-elevated p-1 rounded-xl border border-default',
          trigger: 'text-xs font-bold rounded-lg data-[state=active]:bg-default data-[state=active]:text-primary data-[state=active]:shadow-xs'
        }"
      >
        <template #historico>
          <div class="pt-4">
            <LinhaDoTempoRisco :avaliacoes="historico" />
          </div>
        </template>

        <template #membros>
          <div class="pt-4">
            <ListaMembrosFamilia :membros="membros" />
          </div>
        </template>

        <template #domicilio>
          <div class="pt-4">
            <DadosDomicilioCard :domicilio="domicilio" />
          </div>
        </template>
      </UTabs>
    </UCard>
  </div>

  <div v-else class="p-12 text-center text-muted bg-default rounded-2xl border border-default">
    <Icon :name="ICONES.vazio" class="w-8 h-8 text-dimmed mx-auto mb-2" aria-hidden="true" />
    <h2 class="text-base font-bold text-default">Família não encontrada</h2>
    <p class="text-xs text-muted mt-1">O identificador informado não corresponde a nenhum prontuário ativo.</p>
    <UButton to="/familias" color="primary" label="Voltar para Lista" class="mt-4" />
  </div>
</template>
