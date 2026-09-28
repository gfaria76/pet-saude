<script setup lang="ts">
import type { IndividuoDoc } from '~~/shared/domain/schemas'
import { ICONES } from '~/utils/icones'

const props = defineProps<{
  membros: IndividuoDoc[]
}>()

function calcularIdade(dataNascimento: string): number {
  const hoje = new Date()
  const nasc = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--
  }
  return idade
}

function formatarData(data: string): string {
  const d = new Date(data)
  return Number.isNaN(d.getTime()) ? data : d.toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between border-b border-default pb-3">
      <div>
        <h3 class="text-base font-bold text-highlighted flex items-center gap-2">
          <Icon :name="ICONES.membros" class="w-5 h-5 text-primary" aria-hidden="true" />
          <span>Composição Familiar (Moradores)</span>
        </h3>
        <p class="text-xs text-muted mt-0.5">
          Indivíduos coabitantes vinculados ao prontuário da família.
        </p>
      </div>

      <UBadge color="neutral" variant="subtle" size="sm" class="font-bold">
        {{ membros.length }} {{ membros.length === 1 ? 'morador' : 'moradores' }}
      </UBadge>
    </div>

    <!-- Grid de Moradores -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <UCard
        v-for="membro in membros"
        :key="membro.id"
        class="border border-default shadow-xs hover:border-slate-300 transition-colors"
        :ui="{
          root: 'rounded-xl bg-default flex flex-col justify-between',
          body: 'p-4 flex flex-col justify-between h-full'
        }"
      >
        <div>
          <!-- Cabeçalho do Indivíduo -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-bold text-highlighted text-sm">
                {{ membro.nome }}
              </p>
              <div class="text-xs text-muted flex items-center gap-2 mt-1">
                <UBadge color="primary" variant="subtle" size="xs" class="font-semibold">
                  {{ membro.parentesco }}
                </UBadge>
                <span>{{ calcularIdade(membro.dataNascimento) }} anos ({{ formatarData(membro.dataNascimento) }})</span>
              </div>
            </div>

            <span class="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-muted shrink-0">
              <Icon :name="ICONES.pessoa" class="w-4 h-4" aria-hidden="true" />
            </span>
          </div>

          <!-- Marcadores Clínicos / Sentinelas Individuais -->
          <div class="mt-3 pt-3 border-t border-default">
            <p class="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
              Condições / Marcadores de Saúde:
            </p>

            <div class="flex flex-wrap gap-1.5">
              <UBadge
                v-if="membro.condicoesCronicas.acamado"
                color="error"
                variant="subtle"
                size="xs"
                class="font-bold"
              >
                Acamado(a)
              </UBadge>
              <UBadge
                v-if="membro.condicoesCronicas.hipertenso"
                color="warning"
                variant="subtle"
                size="xs"
                class="font-bold"
              >
                Hipertensão
              </UBadge>
              <UBadge
                v-if="membro.condicoesCronicas.diabetico"
                color="warning"
                variant="subtle"
                size="xs"
                class="font-bold"
              >
                Diabetes
              </UBadge>
              <UBadge
                v-if="membro.condicoesCronicas.deficienciaFisica"
                color="neutral"
                variant="subtle"
                size="xs"
                class="font-bold text-purple-900 bg-purple-100 border border-purple-200"
              >
                Deficiência Física
              </UBadge>
              <UBadge
                v-if="membro.condicoesCronicas.deficienciaMental"
                color="neutral"
                variant="subtle"
                size="xs"
                class="font-bold text-purple-900 bg-purple-100 border border-purple-200"
              >
                Deficiência Mental
              </UBadge>
              <UBadge
                v-if="membro.condicoesCronicas.desnutricaoGrave"
                color="error"
                variant="subtle"
                size="xs"
                class="font-bold"
              >
                Desnutrição Grave
              </UBadge>
              <UBadge
                v-if="membro.condicoesCronicas.usoAbusivoDrogas"
                color="warning"
                variant="subtle"
                size="xs"
                class="font-bold text-orange-900 bg-orange-100 border border-orange-200"
              >
                Dependência Química
              </UBadge>
              <span
                v-if="!membro.condicoesCronicas.acamado && !membro.condicoesCronicas.hipertenso && !membro.condicoesCronicas.diabetico && !membro.condicoesCronicas.deficienciaFisica && !membro.condicoesCronicas.deficienciaMental && !membro.condicoesCronicas.desnutricaoGrave && !membro.condicoesCronicas.usoAbusivoDrogas"
                class="px-2 py-0.5 rounded text-[11px] font-medium text-muted bg-muted border border-default"
              >
                Sem condições crônicas declaradas
              </span>
            </div>
          </div>
        </div>

        <div class="mt-3 pt-2 text-[10px] text-dimmed flex items-center justify-between">
          <span>Identificador: {{ membro.id }}</span>
          <span>Sexo: {{ membro.sexo }}</span>
        </div>
      </UCard>
    </div>
  </div>
</template>
