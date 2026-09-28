<script setup lang="ts">
import { onMounted } from 'vue'
import type { EstadoLocal } from '~/offline/fila'
const { registros, erro, atualizar, descartar } = useCampoOffline()
onMounted(atualizar)
const rotulos: Record<EstadoLocal, string> = {
  rascunho: 'Rascunho — ainda não submetido', pendente: 'Salvo neste aparelho — aguardando envio',
  enviando: 'Envio interrompido — aguardando nova tentativa', confirmado: 'Confirmado pelo servidor',
  conflito: 'Conflito — revisão necessária', rejeitado: 'Rejeitado — revisar acesso ou coleta', requer_login: 'Entre novamente para enviar'
}
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-5 p-4 pb-24">
    <h1 class="text-2xl font-bold">Sincronização</h1>
    <UAlert title="Demonstração local" description="As coletas fictícias permanecem neste aparelho. O envio ao servidor não está habilitado nesta demonstração; nenhum recibo é simulado." color="neutral" variant="outline" />
    <UAlert v-if="erro" :title="erro" color="error" />
    <div class="flex flex-wrap gap-3"><UButton variant="outline" @click="atualizar">Atualizar lista local</UButton><UButton disabled>Enviar ao servidor (indisponível na demonstração)</UButton></div>
    <p v-if="!registros.length" role="status">Nenhuma operação armazenada neste aparelho.</p>
    <UCard v-for="item in registros" :key="item.chave">
      <p class="font-semibold">{{ item.operacao.familiaId }}</p>
      <p role="status">{{ rotulos[item.estado] }}</p>
      <p class="text-sm text-muted">Coleta: {{ item.operacao.coletadoEm }}</p>
      <UButton v-if="item.estado !== 'confirmado' && item.estado !== 'enviando'" color="error" variant="outline" class="my-3" @click="descartar(item.operacao.operacaoId)">Descartar coleta local</UButton>
      <p v-if="item.estado === 'conflito'">A coleta original foi preservada. Revise a versão da família antes de criar uma nova operação.</p>
    </UCard>
  </main>
</template>
