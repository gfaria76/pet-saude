<script setup lang="ts">
import type { DomicilioDoc } from '~~/shared/domain/schemas'
import { ICONES } from '~/utils/icones'

const props = defineProps<{
  domicilio: DomicilioDoc | null | undefined
}>()

const ROTULOS_AGUA: Record<string, string> = {
  REDE_ENCANADA: 'Rede Geral Encanada',
  POCO: 'Poço / Nascente',
  CISTERNA: 'Cisterna / Água de Chuva',
  OUTRO: 'Outro Abastecimento'
}

const ROTULOS_ESGOTO: Record<string, string> = {
  REDE_COLETORA: 'Rede Coletora de Esgoto',
  FOSSA_SEPTICA: 'Fossa Séptica',
  CEU_ABERTO: 'Esgoto a Céu Aberto (Inadequado)',
  OUTRO: 'Outro Sistema'
}

const ROTULOS_LIXO: Record<string, string> = {
  COLETADO: 'Coletado pelo Serviço de Limpeza',
  QUEIMADO: 'Queimado no Terreno',
  ENTERRADO: 'Enterrado no Terreno',
  CEU_ABERTO: 'Céu Aberto / Terreno Baldio'
}
</script>

<template>
  <UCard
    v-if="domicilio"
    class="border border-default shadow-xs"
    :ui="{
      root: 'rounded-2xl bg-default',
      body: 'p-5 sm:p-6 space-y-5'
    }"
  >
    <!-- Cabeçalho -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-default pb-3">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
          <Icon :name="ICONES.domicilio" class="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h4 class="text-sm font-bold text-highlighted">
            Dados do Domicílio e Saneamento
          </h4>
          <p class="text-xs text-muted">
            Condições estruturais e ambientais da residência.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <UBadge
          v-if="domicilio.saneamentoInadequado"
          color="error"
          variant="subtle"
          size="sm"
          class="font-bold flex items-center gap-1"
        >
          <Icon :name="ICONES.saneamento" class="w-3.5 h-3.5" aria-hidden="true" />
          Saneamento Inadequado
        </UBadge>
        <UBadge
          v-if="domicilio.adensamentoExcessivo"
          color="warning"
          variant="subtle"
          size="sm"
          class="font-bold flex items-center gap-1"
        >
          <Icon :name="ICONES.membros" class="w-3.5 h-3.5" aria-hidden="true" />
          Adensamento (>1 morador/cômodo)
        </UBadge>
      </div>
    </div>

    <!-- Endereço -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
      <div class="bg-muted p-3.5 rounded-xl border border-default">
        <span class="block text-muted uppercase tracking-wider text-[10px] font-bold">Logradouro / Número</span>
        <p class="font-bold text-highlighted text-sm mt-0.5">
          {{ domicilio.logradouro }}, {{ domicilio.numero }}
        </p>
        <p class="text-muted mt-0.5">Bairro {{ domicilio.bairro }}</p>
        <p v-if="domicilio.cep" class="text-dimmed text-[11px] mt-0.5">CEP: {{ domicilio.cep }}</p>
      </div>

      <div class="bg-muted p-3.5 rounded-xl border border-default">
        <span class="block text-muted uppercase tracking-wider text-[10px] font-bold">Relação Moradores / Cômodos</span>
        <div class="flex items-baseline gap-2 mt-0.5">
          <p class="font-extrabold text-highlighted text-base">
            {{ (domicilio.quantidadeMoradores / domicilio.quantidadeComodos).toFixed(1) }}
          </p>
          <span class="text-muted text-xs">moradores por cômodo</span>
        </div>
        <p class="text-muted mt-1">
          {{ domicilio.quantidadeMoradores }} moradores para {{ domicilio.quantidadeComodos }} cômodos
        </p>
      </div>

      <div class="bg-muted p-3.5 rounded-xl border border-default">
        <span class="block text-muted uppercase tracking-wider text-[10px] font-bold">Território Adscrito</span>
        <p class="font-bold text-highlighted text-sm mt-0.5 capitalize">
          {{ domicilio.municipioId === 'coxim' ? 'UBS Coxim (MS)' : 'UBS Corumbá (MS)' }}
        </p>
        <p class="text-muted mt-0.5">Equipe: {{ domicilio.equipeId }}</p>
        <p class="text-muted font-semibold text-[11px] mt-0.5">Microárea: {{ domicilio.microareaId }}</p>
      </div>
    </div>

    <!-- Saneamento Básico -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
      <div class="p-3 rounded-lg border border-default bg-default">
        <span class="text-muted text-[11px] font-semibold block">Abastecimento de Água</span>
        <p class="font-bold text-default mt-0.5">{{ ROTULOS_AGUA[domicilio.abastecimentoAgua] ?? domicilio.abastecimentoAgua }}</p>
      </div>

      <div class="p-3 rounded-lg border border-default bg-default">
        <span class="text-muted text-[11px] font-semibold block">Esgotamento Sanitário</span>
        <p class="font-bold text-default mt-0.5">{{ ROTULOS_ESGOTO[domicilio.esgotamentoSanitario] ?? domicilio.esgotamentoSanitario }}</p>
      </div>

      <div class="p-3 rounded-lg border border-default bg-default">
        <span class="text-muted text-[11px] font-semibold block">Destino do Lixo</span>
        <p class="font-bold text-default mt-0.5">{{ ROTULOS_LIXO[domicilio.destinoLixo] ?? domicilio.destinoLixo }}</p>
      </div>
    </div>
  </UCard>
</template>
