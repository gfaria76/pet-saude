<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { FAMILIAS_SINTETICAS } from '~/composables/useFamilias'
const familias = FAMILIAS_SINTETICAS.filter(item => item.municipioId === 'coxim')
const { registros, erro, atualizar } = useCampoOffline()
onMounted(atualizar)
const visitas = computed(() => registros.value.filter(item => item.estado !== 'confirmado'))
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-5 p-4 pb-24">
    <h1 class="text-2xl font-bold">Visitas de campo</h1>
    <UAlert title="Demonstração com dados fictícios" description="O armazenamento local está limitado à demonstração. Dados reais dependem da política institucional de proteção do aparelho." color="neutral" variant="outline" />
    <UAlert v-if="erro" :title="erro" color="error" />
    <p>Abra uma família, registre a coleta e salve um rascunho neste aparelho para retomar depois.</p>
    <div class="grid gap-3">
      <UCard v-for="familia in familias" :key="familia.id">
        <p class="font-semibold">{{ familia.responsavelNome }}</p>
        <UButton :to="`/visitas/${familia.id}`" class="mt-3">Preparar ou retomar coleta</UButton>
      </UCard>
    </div>
    <p v-if="!visitas.length" role="status">Nenhuma coleta preparada neste aparelho.</p>
    <UCard v-for="item in visitas" :key="item.chave">
      <p class="font-semibold">Família fictícia · {{ item.operacao.familiaId }}</p>
      <p>{{ item.estado === 'rascunho' ? 'Rascunho salvo neste aparelho' : 'Coleta salva neste aparelho — aguardando confirmação' }}</p>
      <UButton v-if="item.estado === 'rascunho'" :to="`/visitas/${item.operacao.familiaId}`" class="mt-3">Retomar rascunho</UButton>
      <UButton to="/sincronizacao" variant="outline" class="mt-3">Ver situação</UButton>
    </UCard>
  </main>
</template>
