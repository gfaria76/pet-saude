<script setup lang="ts">
import { getFunctions, httpsCallable } from 'firebase/functions'
import { vinculoSchema, type VinculoInstitucional } from '~~/shared/domain/acesso'
import { PerfilProfissional } from '~~/shared/domain/risk-engine/types'
const { $autenticacao: sessao, $firebaseApp: app } = useNuxtApp()
const uid = ref('')
const perfil = ref<PerfilProfissional>(PerfilProfissional.ACS)
const equipe = ref('')
const microareas = ref('')
const status = ref<'ATIVO' | 'INATIVO'>('ATIVO')
const atual = ref<VinculoInstitucional | null>(null)
const consultado = ref('')
const ocupado = ref(false)
const mensagem = ref('')
const confirmar = ref(false)
const perfis: PerfilProfissional[] = Object.values(PerfilProfissional).filter(p => p !== 'ADMIN')
watch(uid, () => { consultado.value = ''; confirmar.value = false })
async function consultar() {
  if (!app || sessao.acesso.value?.perfil !== 'ADMIN') return
  ocupado.value = true
  mensagem.value = ''
  try {
    const resultado = await httpsCallable<{ uid: string }, { vinculo: unknown }>(getFunctions(app, 'southamerica-east1'), 'consultarVinculo')({ uid: uid.value })
    atual.value = resultado.data.vinculo ? vinculoSchema.parse(resultado.data.vinculo) : null
    consultado.value = uid.value
    perfil.value = atual.value?.perfil ?? PerfilProfissional.ACS
    equipe.value = atual.value?.equipeId ?? ''
    microareas.value = atual.value?.microareaIds.join(', ') ?? ''
    status.value = atual.value?.status ?? 'ATIVO'
  } catch { mensagem.value = 'Não foi possível consultar o vínculo. Verifique seu acesso e a conexão.' }
  finally { ocupado.value = false }
}
async function salvar() {
  const acesso = sessao.acesso.value
  if (!app || acesso?.perfil !== 'ADMIN' || consultado.value !== uid.value || (atual.value && !confirmar.value)) return
  const parse = vinculoSchema.safeParse({ uid: uid.value, tenantId: acesso.tenantId, municipioId: acesso.municipioId, perfil: perfil.value, ...(equipe.value ? { equipeId: equipe.value } : {}), microareaIds: microareas.value.split(',').map(v => v.trim()).filter(Boolean), status: status.value, versaoAcesso: (atual.value?.versaoAcesso ?? 0) + 1 })
  if (!parse.success) { mensagem.value = 'Verifique os identificadores, a equipe e as microáreas obrigatórias para o perfil.'; return }
  ocupado.value = true
  try {
    await httpsCallable(getFunctions(app, 'southamerica-east1'), 'gerirVinculo')({ vinculo: parse.data })
    atual.value = parse.data
    confirmar.value = false
    mensagem.value = 'Vínculo atualizado. O profissional deve selecionar novamente o município para renovar as permissões.'
  } catch { mensagem.value = 'Não foi possível salvar. Consulte novamente o vínculo; seu acesso pode ter mudado.' }
  finally { ocupado.value = false }
}
</script>
<template>
  <UCard :ui="{ body: 'space-y-5' }">
    <h1 class="text-2xl font-bold">Vínculos institucionais</h1>
    <template v-if="sessao.acesso.value?.perfil === 'ADMIN'">
      <p>Município: {{ sessao.acesso.value.municipioId }}</p>
      <p class="text-sm text-muted">Use o identificador da conta institucional fornecido pelo profissional. A conta precisa ter entrado com Google @ufms.br.</p>
      <UFormField label="Identificador do profissional" required><UInput v-model="uid" class="w-full" /></UFormField>
      <UButton :loading="ocupado" :disabled="!uid" @click="consultar">Consultar vínculo</UButton>
      <form v-if="consultado === uid && consultado && atual?.perfil !== 'ADMIN'" class="space-y-4" @submit.prevent="salvar">
        <UFormField label="Perfil"><USelect v-model="perfil" :items="perfis" class="w-full" /></UFormField>
        <UFormField label="Identificador da equipe"><UInput v-model="equipe" class="w-full" /></UFormField>
        <UFormField label="Microáreas (identificadores separados por vírgula)"><UInput v-model="microareas" class="w-full" /></UFormField>
        <UFormField label="Situação"><USelect v-model="status" :items="['ATIVO', 'INATIVO']" class="w-full" /></UFormField>
        <UCheckbox v-if="atual" v-model="confirmar" label="Confirmo a alteração das permissões; o acesso anterior será invalidado imediatamente." />
        <UButton type="submit" :loading="ocupado" :disabled="!!atual && !confirmar">{{ atual ? 'Atualizar vínculo' : 'Aprovar vínculo' }}</UButton>
      </form>
      <p v-else-if="atual?.perfil === 'ADMIN'">Vínculos administrativos exigem gestão institucional externa.</p>
    </template>
    <UAlert v-else title="Acesso administrativo necessário" description="Entre e selecione um município com vínculo de administrador ativo." />
    <p v-if="mensagem" role="status">{{ mensagem }}</p>
    <UButton to="/login" variant="link">Acesso institucional</UButton>
  </UCard>
</template>
