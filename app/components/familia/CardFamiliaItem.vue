<script setup lang="ts">
import type { FamiliaDoc } from '~~/shared/domain/schemas'
import BadgeRiscoFamiliar from '~/components/BadgeRiscoFamiliar.vue'
import { ICONES } from '~/utils/icones'

const props = defineProps<{
  familia: FamiliaDoc
}>()

const emit = defineEmits<{
  (e: 'abrirDrawer', familia: FamiliaDoc): void
  (e: 'reavaliar', familia: FamiliaDoc): void
}>()
</script>

<template>
  <UCard
    class="border border-default shadow-xs hover:shadow-md transition-all"
    :ui="{
      root: 'rounded-2xl bg-default flex flex-col justify-between',
      body: 'p-4 sm:p-5 flex flex-col justify-between h-full gap-4'
    }"
  >
    <!-- Topo do Card -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1 font-mono text-xs font-bold text-default bg-elevated px-2 py-0.5 rounded border border-default">
            <Icon :name="ICONES.prontuario" class="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            <span>{{ familia.prontuarioFamiliar }}</span>
          </span>
          <UBadge color="neutral" variant="subtle" size="sm">
            {{ familia.microareaId }}
          </UBadge>
        </div>

        <h3 class="font-bold text-highlighted text-base mt-2">
          {{ familia.responsavelNome }}
        </h3>

        <p class="text-xs text-muted mt-0.5">
          Equipe: {{ familia.equipeId }} · {{ familia.municipioId === 'coxim' ? 'UBS Coxim' : 'UBS Corumbá' }}
        </p>
      </div>

      <!-- Quantidade de moradores -->
      <span class="inline-flex items-center gap-1 text-toned font-semibold text-xs shrink-0 bg-muted px-2.5 py-1 rounded-lg border border-default">
        <Icon :name="ICONES.familia" class="w-4 h-4 text-muted" aria-hidden="true" />
        {{ familia.quantidadeMembros }}
      </span>
    </div>

    <!-- Estratificação de Risco -->
    <div class="pt-3 border-t border-default flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <BadgeRiscoFamiliar
          :classificacao="familia.ultimaClassificacaoRisco"
          :pontuacao="familia.ultimaPontuacaoRisco"
          :interativo="true"
          tamanho="md"
          @click="emit('abrirDrawer', familia)"
        />
        <div v-if="familia.dataUltimaAvaliacao" class="text-[11px] text-dimmed mt-1">
          Última avaliação: {{ new Date(familia.dataUltimaAvaliacao).toLocaleDateString('pt-BR') }}
        </div>
      </div>

      <!-- Ações rápidas -->
      <div class="flex items-center gap-2 pt-2 sm:pt-0">
        <UButton
          :to="`/familias/${familia.id}`"
          color="neutral"
          variant="subtle"
          size="xs"
          label="Dossiê"
          class="flex-1 sm:flex-none font-semibold text-center justify-center"
        />
        <UButton
          :to="`/familias/${familia.id}/avaliar`"
          color="primary"
          size="xs"
          label="Reavaliar"
          class="flex-1 sm:flex-none font-bold text-center justify-center shadow-xs"
        />
      </div>
    </div>
  </UCard>
</template>
