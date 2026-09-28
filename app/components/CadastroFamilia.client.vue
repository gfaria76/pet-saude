<script setup lang="ts">
import { OperacaoCadastroSchema, type OperacaoCadastro, type ReciboCadastro } from '~~/shared/domain/cadastro'
import { criarEnvioCadastro } from '~/services/cadastros'

const { $autenticacao: sessao, $firebaseApp } = useNuxtApp()
const { acesso, identidade, inicializado } = sessao
const formularioInicial = () => ({ equipeId: '', microareaId: '', prontuarioFamiliar: '', contato: '', logradouro: '', numero: '', bairro: '', quantidadeComodos: '', quantidadeMoradores: '', abastecimentoAgua: '', esgotamentoSanitario: '', destinoLixo: '', nome: '', dataNascimento: '', sexo: '' })
const dados = reactive(formularioInicial())
const condicoes = [ ['hipertenso', 'Hipertensão'], ['diabetico', 'Diabetes'], ['acamado', 'Acamado'], ['deficienciaFisica', 'Deficiência física'], ['deficienciaMental', 'Deficiência mental'], ['desnutricaoGrave', 'Desnutrição grave'], ['usoAbusivoDrogas', 'Uso abusivo de álcool ou outras drogas'] ] as const
const respostas = reactive<Record<string, boolean | undefined>>({})
const pendente = shallowRef<OperacaoCadastro | null>(null)
const recibo = ref<ReciboCadastro | null>(null)
const enviando = ref(false)
const erro = ref('')
let revisao = 0
watch([acesso, identidade], () => {
  ++revisao
  Object.assign(dados, formularioInicial())
  for (const chave of Object.keys(respostas)) delete respostas[chave]
  pendente.value = null; recibo.value = null; erro.value = ''; enviando.value = false
})
const alterado = computed(() => Object.values(dados).some(Boolean) || Object.keys(respostas).length > 0)
async function salvar() {
  if (!acesso.value || !$firebaseApp || enviando.value || recibo.value) return
  erro.value = ''
  if (!pendente.value) {
    const validacao = OperacaoCadastroSchema.safeParse({
      tipo: 'CRIAR', operacaoId: crypto.randomUUID(), tenantId: acesso.value.tenantId,
      equipeId: acesso.value.perfil === 'COORDENADOR_APS' ? dados.equipeId.trim() : acesso.value.equipeId,
      microareaId: dados.microareaId.trim(), prontuarioFamiliar: dados.prontuarioFamiliar.trim(),
      ...(dados.contato.trim() ? { contato: dados.contato.trim() } : {}),
      domicilio: { logradouro: dados.logradouro.trim(), numero: dados.numero.trim(), bairro: dados.bairro.trim(),
        quantidadeComodos: Number(dados.quantidadeComodos), quantidadeMoradores: Number(dados.quantidadeMoradores),
        abastecimentoAgua: dados.abastecimentoAgua, esgotamentoSanitario: dados.esgotamentoSanitario, destinoLixo: dados.destinoLixo,
        saneamentoInadequado: respostas.saneamentoInadequado, adensamentoExcessivo: respostas.adensamentoExcessivo },
      responsavel: { nome: dados.nome.trim(), dataNascimento: dados.dataNascimento, sexo: dados.sexo, parentesco: 'RESPONSAVEL',
        condicoesCronicas: Object.fromEntries(condicoes.map(([chave]) => [chave, respostas[chave]])) }
    })
    if (!validacao.success) {
      erro.value = validacao.error.issues.some(issue => issue.path.includes('adensamentoExcessivo'))
        ? 'Revise a resposta de adensamento: marque Sim quando houver mais de um morador por cômodo, ou Não caso contrário.'
        : 'Revise os campos obrigatórios e responda todas as condições com Sim ou Não. Cômodos e moradores devem estar entre 1 e 100.'
      return
    }
    pendente.value = validacao.data
  }
  const atual = revisao
  enviando.value = true
  try {
    const resultado = await criarEnvioCadastro($firebaseApp)(pendente.value)
    if (atual === revisao) recibo.value = resultado
  } catch { if (atual === revisao) erro.value = 'Cadastro sem confirmação. Verifique conexão e território e tente confirmar novamente. Os dados permanecem nesta tela.' }
  finally { if (atual === revisao) enviando.value = false }
}
function impedirFechamento(evento: BeforeUnloadEvent) {
  if (alterado.value && !recibo.value) { evento.preventDefault(); evento.returnValue = '' }
}
onMounted(() => window.addEventListener('beforeunload', impedirFechamento))
onUnmounted(() => window.removeEventListener('beforeunload', impedirFechamento))
onBeforeRouteLeave(() => { if (alterado.value && !recibo.value) return window.confirm('O cadastro ainda não foi confirmado. Sair descarta os dados desta tela. Deseja sair?') })
</script>
<template>
  <section class="space-y-6">
    <h1 class="text-2xl font-bold">Cadastrar família</h1>
    <UButton to="/operacional" color="neutral" variant="outline">Voltar à área operacional</UButton>
    <p v-if="!inicializado" role="status">Verificando sessão…</p>
    <UButton v-else-if="!identidade || !acesso" to="/login">Entrar e selecionar município</UButton>
    <UAlert v-else-if="acesso.perfil === 'ADMIN'" title="Perfil administrativo sem acesso a cadastros de saúde" />
    <form v-else class="space-y-6" autocomplete="off" @submit.prevent="salvar">
      <p>Cadastro online de uma família com seu responsável. Outros moradores não serão cadastrados automaticamente. O cadastro ainda não é uma avaliação de risco.</p>
      <UAlert title="Ambiente em validação" description="Utilize apenas dados fictícios. Os dados ficam na memória desta tela até a confirmação do servidor; não há salvamento offline." color="warning" variant="subtle" />
      <fieldset :disabled="!!pendente" class="space-y-4">
        <legend class="mb-3 text-lg font-semibold">Território e identificação</legend>
        <p>Município: {{ acesso.municipioId }}</p>
        <p v-if="acesso.perfil !== 'ACS'" class="text-sm text-muted">Consulte a gestão territorial para confirmar os identificadores da equipe e da microárea.</p>
        <label v-if="acesso.perfil === 'COORDENADOR_APS'" class="block">Identificador da equipe<input v-model="dados.equipeId" required maxlength="64" class="campo"></label>
        <p v-else>Equipe: {{ acesso.equipeId }}</p>
        <label class="block">Identificador da microárea<select v-if="acesso.perfil === 'ACS'" v-model="dados.microareaId" required class="campo"><option value="" disabled>Selecione</option><option v-for="id in acesso.microareaIds" :key="id" :value="id">{{ id }}</option></select><input v-else v-model="dados.microareaId" required maxlength="64" class="campo"></label>
        <label class="block">Prontuário familiar<input v-model="dados.prontuarioFamiliar" required maxlength="32" class="campo"></label>
        <label class="block">Contato (opcional)<input v-model="dados.contato" maxlength="80" class="campo"></label>
      </fieldset>
      <fieldset :disabled="!!pendente" class="space-y-4">
        <legend class="mb-3 text-lg font-semibold">Domicílio</legend>
        <label class="block">Logradouro<input v-model="dados.logradouro" required minlength="2" maxlength="200" class="campo"></label>
        <label class="block">Número<input v-model="dados.numero" required maxlength="20" class="campo"></label>
        <label class="block">Bairro<input v-model="dados.bairro" required maxlength="120" class="campo"></label>
        <label class="block">Quantidade de cômodos<input v-model="dados.quantidadeComodos" type="number" min="1" max="100" required class="campo"></label>
        <label class="block">Quantidade de moradores do domicílio<input v-model="dados.quantidadeMoradores" type="number" min="1" max="100" required class="campo"></label>
        <label class="block">Abastecimento de água<select v-model="dados.abastecimentoAgua" required class="campo"><option value="" disabled>Selecione</option><option value="REDE_ENCANADA">Rede encanada</option><option value="POCO">Poço</option><option value="CISTERNA">Cisterna</option><option value="OUTRO">Outro</option></select></label>
        <label class="block">Esgotamento sanitário<select v-model="dados.esgotamentoSanitario" required class="campo"><option value="" disabled>Selecione</option><option value="REDE_COLETORA">Rede coletora</option><option value="FOSSA_SEPTICA">Fossa séptica</option><option value="CEU_ABERTO">Céu aberto</option><option value="OUTRO">Outro</option></select></label>
        <label class="block">Destino do lixo<select v-model="dados.destinoLixo" required class="campo"><option value="" disabled>Selecione</option><option value="COLETADO">Coletado</option><option value="QUEIMADO">Queimado</option><option value="ENTERRADO">Enterrado</option><option value="CEU_ABERTO">Céu aberto</option></select></label>
        <fieldset v-for="[chave, rotulo] in [['saneamentoInadequado', 'Saneamento inadequado'], ['adensamentoExcessivo', 'Mais de um morador por cômodo']]" :key="chave">
          <legend>{{ rotulo }}</legend><div class="flex gap-6"><label class="flex min-h-11 items-center gap-2"><input v-model="respostas[chave!]" type="radio" :name="chave" :value="true" required>Sim</label><label class="flex min-h-11 items-center gap-2"><input v-model="respostas[chave!]" type="radio" :name="chave" :value="false" required>Não</label></div>
        </fieldset>
      </fieldset>
      <fieldset :disabled="!!pendente" class="space-y-4">
        <legend class="mb-3 text-lg font-semibold">Responsável familiar</legend>
        <label class="block">Nome<input v-model="dados.nome" required minlength="2" maxlength="120" class="campo"></label>
        <label class="block">Data de nascimento<input v-model="dados.dataNascimento" type="date" required class="campo"></label>
        <label class="block">Sexo<select v-model="dados.sexo" required class="campo"><option value="" disabled>Selecione</option><option value="MASCULINO">Masculino</option><option value="FEMININO">Feminino</option><option value="OUTRO">Outro</option></select></label>
        <p>Registre apenas condições conhecidas. Se não houver informação suficiente, complete a coleta antes de enviar.</p>
        <fieldset v-for="[chave, rotulo] in condicoes" :key="chave"><legend>{{ rotulo }}</legend><div class="flex gap-6"><label class="flex min-h-11 items-center gap-2"><input v-model="respostas[chave]" type="radio" :name="chave" :value="true" required>Sim</label><label class="flex min-h-11 items-center gap-2"><input v-model="respostas[chave]" type="radio" :name="chave" :value="false" required>Não</label></div></fieldset>
      </fieldset>
      <UAlert v-if="erro" :title="erro" color="error" role="alert" />
      <UAlert v-if="recibo" :title="recibo.status === 'CONFIRMADA' ? 'Cadastro confirmado' : 'Cadastro precisa de revisão'" variant="subtle" :color="recibo.status === 'CONFIRMADA' ? 'success' : 'warning'" role="status" />
      <UButton v-if="!recibo" type="submit" :loading="enviando">{{ pendente ? 'Tentar confirmar novamente' : 'Enviar cadastro' }}</UButton>
      <UButton v-else to="/operacional">Consultar famílias</UButton>
    </form>
  </section>
</template>
<style scoped>
input[type="radio"] { width: 20px; height: 20px; }
.campo { display: block; width: 100%; min-height: 44px; margin-top: 4px; padding: 8px 12px; border: 1px solid var(--ui-border); border-radius: 6px; background: var(--ui-bg); color: var(--ui-text); }
</style>
