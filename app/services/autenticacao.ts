import {
  GoogleAuthProvider, browserSessionPersistence, getIdTokenResult,
  onIdTokenChanged, setPersistence, signInWithPopup, signOut,
  type Auth, type User
} from 'firebase/auth'
import { readonly, ref } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { claimsAcessoSchema, identidadeInstitucionalValida, vinculoSchema, type ClaimsAcesso, type VinculoInstitucional } from '~~/shared/domain/acesso'
export { identidadeInstitucionalValida } from '~~/shared/domain/acesso'

export interface IdentidadeInstitucional {
  uid: string
  email: string
}

export function mensagemErroAutenticacao(erro: unknown): string {
  const codigo = typeof erro === 'object' && erro !== null && 'code' in erro ? erro.code : ''
  switch (codigo) {
    case 'auth/popup-closed-by-user': return 'A entrada foi cancelada. Você pode tentar novamente.'
    case 'auth/popup-blocked': return 'Permita pop-ups para este site e tente novamente.'
    case 'auth/network-request-failed': return 'Não foi possível conectar. Verifique a internet e tente novamente.'
    case 'auth/unauthorized-domain':
    case 'auth/operation-not-allowed': return 'A entrada institucional ainda não está habilitada neste ambiente.'
    case 'auth/web-storage-unsupported': return 'Permita o armazenamento de sessão neste navegador para entrar.'
    default: return 'Não foi possível concluir a entrada. Tente novamente.'
  }
}

/** Instância por aplicação cliente; objetos Firebase e tokens nunca vão ao payload SSR. */
export function criarAutenticacao(auth: Auth | null) {
  const identidade = ref<IdentidadeInstitucional | null>(null)
  const vinculos = ref<VinculoInstitucional[]>([])
  const acesso = ref<ClaimsAcesso | null>(null)
  const carregando = ref(false)
  const inicializado = ref(!auth)
  const erro = ref('')
  let revisao = 0
  let destruido = false
  const saidaPendente = ref(false)

  async function atualizar(user: User | null) {
    if (destruido) return
    const atual = ++revisao
    identidade.value = null
    acesso.value = null
    vinculos.value = []
    try {
      if (!user) return
      const token = await getIdTokenResult(user)
      if (atual !== revisao) return
      if (!identidadeInstitucionalValida(token.claims.email, token.claims.email_verified, token.signInProvider)) {
        erro.value = 'Use uma conta Google verificada com e-mail @ufms.br.'
        try { await signOut(auth!); saidaPendente.value = false } catch { saidaPendente.value = true }
        return
      }
      identidade.value = { uid: user.uid, email: token.claims.email as string }
      const claims = claimsAcessoSchema.safeParse(token.claims)
      if (claims.success) acesso.value = claims.data
    } catch (e) {
      if (atual === revisao) erro.value = mensagemErroAutenticacao(e)
    } finally {
      if (atual === revisao) inicializado.value = true
    }
  }

  const pronto = auth ? setPersistence(auth, browserSessionPersistence) : Promise.resolve()
  let cancelar = () => {}
  void pronto.then(() => {
    if (!auth || destruido) return
    cancelar = onIdTokenChanged(auth, user => { void atualizar(user) }, e => {
      ++revisao
      identidade.value = null
      acesso.value = null
      vinculos.value = []
      erro.value = mensagemErroAutenticacao(e)
      inicializado.value = true
    })
  }).catch(e => {
    erro.value = mensagemErroAutenticacao(e)
    inicializado.value = true
  })

  async function entrar() {
    if (!auth || carregando.value) return
    carregando.value = true
    erro.value = ''
    try {
      await pronto
      const provider = new GoogleAuthProvider()
      // Sugestão ao seletor Google, não uma barreira de autorização.
      provider.setCustomParameters({ hd: 'ufms.br', prompt: 'select_account' })
      const resultado = await signInWithPopup(auth, provider)
      await atualizar(resultado.user)
    } catch (e) {
      erro.value = mensagemErroAutenticacao(e)
    } finally {
      carregando.value = false
    }
  }

  async function sair() {
    if (!auth || carregando.value) return
    carregando.value = true
    erro.value = ''
    // Retira a identidade imediatamente, mesmo se o SDK falhar ao sair.
    ++revisao
    identidade.value = null
    acesso.value = null
    vinculos.value = []
    try { await signOut(auth); saidaPendente.value = false } catch {
      saidaPendente.value = true
      erro.value = 'Não foi possível encerrar a sessão. Tente sair novamente.'
    } finally { carregando.value = false }
  }

  async function carregarVinculos() {
    if (!auth?.currentUser || !identidade.value || carregando.value) return
    const atual = revisao
    carregando.value = true
    erro.value = ''
    try {
      const chamada = httpsCallable<undefined, { vinculos: unknown[] }>(getFunctions(auth.app, 'southamerica-east1'), 'listarMeusVinculos')
      const resultado = await chamada()
      if (atual === revisao) vinculos.value = resultado.data.vinculos.map(v => vinculoSchema.parse(v))
    } catch { if (atual === revisao) erro.value = 'Não foi possível consultar os vínculos. Verifique a conexão e tente novamente.' }
    finally { carregando.value = false }
  }

  async function selecionarMunicipio(tenantId: string) {
    if (!auth?.currentUser || carregando.value) return
    const user = auth.currentUser
    const atual = revisao
    carregando.value = true
    erro.value = ''
    acesso.value = null
    try {
      await httpsCallable(getFunctions(auth.app, 'southamerica-east1'), 'selecionarTenant')({ tenantId })
      if (atual !== revisao) return
      await user.getIdToken(true)
      await atualizar(user)
    } catch { if (atual === revisao) erro.value = 'Não foi possível ativar o município. Atualize seus vínculos e tente novamente.' }
    finally { carregando.value = false }
  }

  return {
    identidade: readonly(identidade), carregando: readonly(carregando),
    inicializado: readonly(inicializado), erro: readonly(erro),
    vinculos: readonly(vinculos), acesso: readonly(acesso), carregarVinculos, selecionarMunicipio,
    saidaPendente: readonly(saidaPendente),
    configurado: auth !== null, entrar, sair,
    destruir: () => { destruido = true; ++revisao; cancelar() }
  }
}
