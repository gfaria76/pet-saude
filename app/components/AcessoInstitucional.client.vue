<script setup lang="ts">
const { $autenticacao: sessao } = useNuxtApp()
const { identidade, inicializado, carregando, erro, configurado, vinculos, acesso, saidaPendente } = sessao
</script>

<template>
  <UCard :ui="{ body: 'space-y-6 p-5 sm:p-8' }">
    <div>
      <p class="text-sm font-semibold text-primary">PET-Saúde · UFMS</p>
      <h1 class="mt-2 text-2xl font-bold text-highlighted">{{ identidade ? 'Acesso institucional' : 'Entrar com conta institucional' }}</h1>
      <p class="mt-3 text-muted">{{ identidade ? 'Sua identidade foi reconhecida. O acesso ao município e à equipe depende de liberação institucional.' : 'Utilize sua conta Google com e-mail @ufms.br para identificar-se.' }}</p>
    </div>

    <UAlert v-if="erro" color="error" variant="subtle" title="Não foi possível concluir" :description="erro" role="alert" />
    <UAlert v-if="!configurado" color="info" variant="subtle" title="Entrada em preparação" description="O login institucional ainda não está configurado neste ambiente. A demonstração permanece disponível." />

    <div v-if="!inicializado" role="status" class="text-muted">Verificando sessão…</div>
    <template v-else-if="identidade">
      <p class="break-all text-sm text-default">Conta: {{ identidade.email }}</p>
      <p class="break-all text-sm text-muted">Identificador para solicitar vínculo: {{ identidade.uid }}</p>
      <UButton v-if="acesso?.perfil === 'ADMIN'" to="/administracao" variant="outline">Gerenciar vínculos</UButton>
      <UButton v-if="acesso && acesso.perfil !== 'ADMIN'" to="/operacional" class="min-h-11 w-full justify-center">Abrir área operacional</UButton>
      <UAlert v-if="acesso" color="success" variant="subtle" title="Município selecionado" :description="`${acesso.municipioId} · ${acesso.perfil}`" />
      <UButton color="neutral" variant="outline" :loading="carregando" @click="sessao.carregarVinculos">Consultar meus vínculos</UButton>
      <div v-if="vinculos.length" class="space-y-3" aria-label="Municípios autorizados">
        <UButton v-for="vinculo in vinculos" :key="vinculo.tenantId" class="min-h-11 w-full justify-center" :loading="carregando" @click="sessao.selecionarMunicipio(vinculo.tenantId)">Ativar {{ vinculo.municipioId }} · {{ vinculo.perfil }}</UButton>
      </div>
      <p v-else class="text-sm text-muted">Consulte os vínculos aprovados pela instituição. Conta Google sem vínculo aprovado não concede acesso operacional.</p>
      <UButton color="neutral" variant="outline" class="min-h-11 w-full justify-center" :loading="carregando" @click="sessao.sair">Sair da conta</UButton>
    </template>
    <UButton v-else-if="saidaPendente" color="neutral" :loading="carregando" @click="sessao.sair">Tentar sair novamente</UButton>
    <UButton v-else class="min-h-12 w-full justify-center" :disabled="!configurado" :loading="carregando" @click="sessao.entrar">Entrar com Google @ufms.br</UButton>

    <div class="border-t border-default pt-5">
      <UButton to="/" color="neutral" variant="link" class="min-h-11 px-0">Explorar demonstração</UButton>
      <p class="text-xs text-muted">Somente dados fictícios. A demonstração usa memória e pode guardar a fila de campo neste navegador. Esses dados não são associados à sua conta institucional.</p>
    </div>
  </UCard>
</template>
