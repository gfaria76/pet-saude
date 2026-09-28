<script setup lang="ts">
import { criarRepositorioFamilias, type FamiliaVersionada } from '~/repositories/familias'
import { criarEnvioCadastro } from '~/services/cadastros'
import { OperacaoCadastroSchema, type OperacaoCadastro, type ReciboCadastro } from '~~/shared/domain/cadastro'
const { $autenticacao: sessao, $firestore, $firebaseApp } = useNuxtApp()
const { acesso, identidade, inicializado } = sessao
const familias = ref<FamiliaVersionada[]>([])
const selecionada = ref<FamiliaVersionada | null>(null)
const proximo = ref<string | null>(null)
const carregando = ref(false)
const consultado = ref(false)
const enviando = ref(false)
const erro = ref('')
const equipeId = ref('')
const microareaId = ref('')
const acao = ref<'TRANSFERIR' | 'MUDOU_SE' | 'DESMEMBRADA'>('TRANSFERIR')
const pendente = shallowRef<OperacaoCadastro | null>(null)
const recibo = ref<ReciboCadastro | null>(null)
let revisao = 0
function limpar() { selecionada.value = null; equipeId.value = ''; microareaId.value = ''; acao.value = 'TRANSFERIR'; pendente.value = null; recibo.value = null; erro.value = '' }
watch([acesso, identidade], () => { ++revisao; familias.value = []; proximo.value = null; consultado.value = false; limpar(); enviando.value = false; carregando.value = false })
async function carregar(mais = false) {
  if (!$firestore || !acesso.value || carregando.value) return
  const atual = revisao
  carregando.value = true; erro.value = ''
  try {
    const pagina = await criarRepositorioFamilias($firestore, { ...acesso.value, microareaIds: [...acesso.value.microareaIds] }).listarPagina(mais && proximo.value ? { apos: proximo.value } : {})
    if (atual === revisao) { consultado.value = true; familias.value = mais ? [...familias.value, ...pagina.familias] : pagina.familias; proximo.value = pagina.proximo }
  } catch { if (atual === revisao) erro.value = 'Não foi possível consultar as famílias. Verifique conexão e vínculo territorial.' }
  finally { if (atual === revisao) carregando.value = false }
}
async function salvar() {
  if (!acesso.value || acesso.value.perfil !== 'COORDENADOR_APS' || !$firebaseApp || !selecionada.value || enviando.value || recibo.value) return
  const familia = selecionada.value
  if (!pendente.value) {
    const comum = { operacaoId: crypto.randomUUID(), tenantId: acesso.value.tenantId, familiaId: familia.id, versaoCadastroBase: familia.versaoCadastro }
    const validacao = OperacaoCadastroSchema.safeParse(acao.value === 'TRANSFERIR'
      ? { ...comum, tipo: 'TRANSFERIR', equipeId: equipeId.value.trim(), microareaId: microareaId.value.trim() }
      : { ...comum, tipo: 'ATUALIZAR', prontuarioFamiliar: familia.prontuarioFamiliar, ...(familia.contato ? { contato: familia.contato } : {}), status: acao.value })
    if (!validacao.success) { erro.value = 'Revise o destino informado antes de continuar.'; return }
    const mensagem = acao.value === 'TRANSFERIR'
      ? `Transferir o prontuário ${familia.prontuarioFamiliar} para a equipe ${equipeId.value.trim()} e microárea ${microareaId.value.trim()}? O acesso territorial atual será alterado.`
      : `Inativar o prontuário ${familia.prontuarioFamiliar} com motivo ${acao.value === 'MUDOU_SE' ? 'mudança' : 'desmembramento'}? O histórico será preservado.`
    if (!window.confirm(mensagem)) return
    pendente.value = validacao.data
  }
  const atual = revisao
  enviando.value = true; erro.value = ''
  try {
    const resultado = await criarEnvioCadastro($firebaseApp)(pendente.value)
    if (atual === revisao) recibo.value = resultado
  } catch { if (atual === revisao) erro.value = 'Operação sem confirmação. Verifique conexão, território e permissões. Tente confirmar novamente com os mesmos dados.' }
  finally { if (atual === revisao) enviando.value = false }
}
function impedirFechamento(evento: BeforeUnloadEvent) { if (pendente.value && !recibo.value) { evento.preventDefault(); evento.returnValue = '' } }
onMounted(() => window.addEventListener('beforeunload', impedirFechamento))
onUnmounted(() => window.removeEventListener('beforeunload', impedirFechamento))
onBeforeRouteLeave(() => { if (pendente.value && !recibo.value) return window.confirm('Há uma operação sem confirmação. Sair perde os dados de reenvio desta tela. Deseja sair?') })
</script>
<template>
  <section class="space-y-6">
    <h1 class="text-2xl font-bold">Transferir ou inativar família</h1>
    <UButton to="/operacional" color="neutral" variant="outline">Voltar à área operacional</UButton>
    <p v-if="!inicializado" role="status">Verificando sessão…</p>
    <UButton v-else-if="!identidade || !acesso" to="/login">Entrar e selecionar município</UButton>
    <UAlert v-else-if="acesso.perfil !== 'COORDENADOR_APS'" title="Acesso restrito à coordenação da APS" />
    <template v-else>
      <p>Alterações online no município {{ acesso.municipioId }}. O histórico de avaliações será preservado. Transferências entre municípios não estão disponíveis.</p>
      <UAlert title="Ambiente em validação" description="Utilize apenas dados fictícios. Não há salvamento offline nesta tela." color="warning" variant="subtle" />
      <UAlert v-if="erro" :title="erro" color="error" role="alert" />
      <template v-if="!selecionada">
        <UButton :loading="carregando" @click="carregar()">Consultar famílias</UButton>
        <p v-if="consultado && !carregando && !familias.length" role="status">Nenhuma família encontrada neste município.</p>
        <ul class="space-y-2" aria-label="Famílias autorizadas"><li v-for="familia in familias" :key="familia.id"><UButton variant="outline" color="neutral" @click="selecionada = familia">Prontuário {{ familia.prontuarioFamiliar }} · {{ familia.status === 'ATIVA' ? 'Ativa' : 'Inativa' }}</UButton></li></ul>
        <UButton v-if="proximo" :loading="carregando" @click="carregar(true)">Carregar mais famílias</UButton>
      </template>
      <form v-else class="space-y-5" @submit.prevent="salvar">
        <h2 class="text-xl font-semibold">Prontuário {{ selecionada.prontuarioFamiliar }}</h2>
        <p>Território atual: {{ selecionada.equipeId }} / {{ selecionada.microareaId }}. Versão {{ selecionada.versaoCadastro }}.</p>
        <fieldset :disabled="!!pendente" class="space-y-4">
          <legend class="mb-3 font-semibold">Alteração desejada</legend>
          <label class="block">Ação<select v-model="acao" class="campo"><option value="TRANSFERIR">Transferir território no município</option><option value="MUDOU_SE">Inativar por mudança</option><option value="DESMEMBRADA">Inativar por desmembramento</option></select></label>
          <template v-if="acao === 'TRANSFERIR'">
            <p>Confirme os identificadores de destino com a gestão territorial.</p>
            <label class="block">Identificador da equipe de destino<input v-model="equipeId" required maxlength="64" class="campo"></label>
            <label class="block">Identificador da microárea de destino<input v-model="microareaId" required maxlength="64" class="campo"></label>
          </template>
        </fieldset>
        <UAlert v-if="recibo?.status === 'CONFIRMADA'" color="success" title="Alteração confirmada" role="status" />
        <UAlert v-else-if="recibo" color="warning" variant="subtle" title="Cadastro alterado por outra operação" description="Nenhum dado foi sobrescrito. Volte à lista, consulte o cadastro atualizado e revise a alteração antes de enviá-la novamente." role="status" />
        <UButton v-if="!recibo" type="submit" :loading="enviando">{{ pendente ? 'Tentar confirmar novamente' : 'Revisar e confirmar alteração' }}</UButton>
        <UButton v-if="!pendente || recibo" color="neutral" variant="outline" @click="limpar(); familias = []; proximo = null; consultado = false">Voltar à lista</UButton>
      </form>
    </template>
  </section>
</template>
<style scoped>
input[type="radio"] { width: 20px; height: 20px; }
.campo { display: block; width: 100%; min-height: 44px; margin-top: 4px; padding: 8px 12px; border: 1px solid var(--ui-border); border-radius: 6px; background: var(--ui-bg); color: var(--ui-text); }
</style>
