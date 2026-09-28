import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Auth, User } from 'firebase/auth'

const firebase = vi.hoisted(() => ({
  token: vi.fn(), popup: vi.fn(), sair: vi.fn(), persistir: vi.fn(),
  observar: vi.fn(), parametros: vi.fn()
}))
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class { setCustomParameters = firebase.parametros },
  browserSessionPersistence: 'session',
  getIdTokenResult: firebase.token,
  signInWithPopup: firebase.popup,
  signOut: firebase.sair,
  setPersistence: firebase.persistir,
  onIdTokenChanged: firebase.observar
}))
import { criarAutenticacao, identidadeInstitucionalValida, mensagemErroAutenticacao } from '../../app/services/autenticacao'

beforeEach(() => {
  vi.resetAllMocks()
  firebase.persistir.mockResolvedValue(undefined)
  firebase.sair.mockResolvedValue(undefined)
  firebase.observar.mockReturnValue(() => {})
  firebase.popup.mockResolvedValue({ user: { uid: 'uid-ficticio' } })
})

function token(email = 'usuario.ficticio@ufms.br', verified = true, provider = 'google.com') {
  return { claims: { email, email_verified: verified }, signInProvider: provider }
}

describe('Identificação institucional (sem conceder autorização)', () => {
  it.each([
    ['usuario.ficticio@ufms.br', true, 'google.com', true],
    ['usuario.ficticio@UFMS.BR', true, 'google.com', true],
    ['usuario.ficticio@ufms.br.evil.test', true, 'google.com', false],
    ['usuario.ficticio@sub.ufms.br', true, 'google.com', false],
    ['usuario.ficticio@gmail.com', true, 'google.com', false],
    ['usuario.ficticio@ufms.br', false, 'google.com', false],
    ['usuario.ficticio@ufms.br', true, 'password', false],
    [undefined, true, 'google.com', false],
    ['usuario.ficticio@ufms.br ', true, 'google.com', false]
  ])('valida domínio exato, verificação e provedor (%s)', (email, verified, provider, esperado) => {
    expect(identidadeInstitucionalValida(email, verified, provider)).toBe(esperado)
  })

  it('funciona sem configuração Firebase e não tenta autenticar', async () => {
    const sessao = criarAutenticacao(null)
    await sessao.entrar()
    expect(sessao.configurado).toBe(false)
    expect(sessao.inicializado.value).toBe(true)
    expect(firebase.popup).not.toHaveBeenCalled()
  })

  it('usa sessão por aba e não guarda tokens ou permissões na identidade', async () => {
    firebase.token.mockResolvedValue(token())
    const auth = {} as Auth
    const sessao = criarAutenticacao(auth)
    await sessao.entrar()
    expect(firebase.persistir).toHaveBeenCalledWith(auth, 'session')
    expect(firebase.parametros).toHaveBeenCalledWith({ hd: 'ufms.br', prompt: 'select_account' })
    expect(sessao.identidade.value).toEqual({ uid: 'uid-ficticio', email: 'usuario.ficticio@ufms.br' })
  })

  it('encerra sessão de conta externa', async () => {
    firebase.token.mockResolvedValue(token('usuario.ficticio@gmail.com'))
    const sessao = criarAutenticacao({} as Auth)
    await sessao.entrar()
    expect(firebase.sair).toHaveBeenCalled()
    expect(sessao.identidade.value).toBeNull()
    expect(sessao.erro.value).toContain('@ufms.br')
  })

  it('restaura identidade pelo listener e limpa no logout', async () => {
    firebase.token.mockResolvedValue(token())
    const sessao = criarAutenticacao({} as Auth)
    await Promise.resolve()
    const observar = firebase.observar.mock.calls[0]![1] as (user: User | null) => void
    observar({ uid: 'uid-ficticio' } as User)
    await vi.waitFor(() => expect(sessao.identidade.value).not.toBeNull())
    await sessao.sair()
    expect(sessao.identidade.value).toBeNull()
  })

  it('resultado atrasado não reabre identidade após logout', async () => {
    let resolver!: (value: ReturnType<typeof token>) => void
    firebase.token.mockReturnValue(new Promise(resolve => { resolver = resolve }))
    const sessao = criarAutenticacao({} as Auth)
    await Promise.resolve()
    const observar = firebase.observar.mock.calls[0]![1] as (user: User | null) => void
    observar({ uid: 'uid-ficticio' } as User)
    await sessao.sair()
    resolver(token())
    await Promise.resolve()
    expect(sessao.identidade.value).toBeNull()
  })

  it('não expõe mensagens brutas de erro ou tokens', async () => {
    firebase.popup.mockRejectedValue({ code: 'auth/network-request-failed', message: 'segredo-teste' })
    const sessao = criarAutenticacao({} as Auth)
    await sessao.entrar()
    expect(sessao.erro.value).toContain('internet')
    expect(sessao.erro.value).not.toContain('segredo-teste')
    expect(sessao.carregando.value).toBe(false)
    expect(mensagemErroAutenticacao(new Error('segredo-teste'))).not.toContain('segredo-teste')
  })
})


describe('Encerramento e descarte da sessão', () => {
  it('não instala listener depois do descarte durante persistência pendente', async () => {
    let resolver!: () => void
    firebase.persistir.mockReturnValue(new Promise<void>(resolve => { resolver = resolve }))
    const sessao = criarAutenticacao({} as Auth)
    sessao.destruir()
    resolver()
    await Promise.resolve()
    expect(firebase.observar).not.toHaveBeenCalled()
  })
  it('mantém opção de tentar sair quando o SDK falha e limpa após sucesso', async () => {
    firebase.sair.mockRejectedValueOnce(new Error('falha fictícia'))
    const sessao = criarAutenticacao({} as Auth)
    await sessao.sair()
    expect(sessao.identidade.value).toBeNull()
    expect(sessao.saidaPendente.value).toBe(true)
    await sessao.sair()
    expect(sessao.saidaPendente.value).toBe(false)
  })
})


it('erro do observador invalida resultado de token em andamento', async () => {
  let resolver!: (value: ReturnType<typeof token>) => void
  firebase.token.mockReturnValue(new Promise(resolve => { resolver = resolve }))
  const sessao = criarAutenticacao({} as Auth)
  await Promise.resolve()
  const observar = firebase.observar.mock.calls[0]![1] as (user: User | null) => void
  const falhar = firebase.observar.mock.calls[0]![2] as (erro: unknown) => void
  observar({ uid: 'uid-ficticio' } as User)
  falhar(new Error('falha fictícia'))
  resolver(token())
  await Promise.resolve()
  expect(sessao.identidade.value).toBeNull()
})

it('descarte durante popup impede restauração tardia da identidade', async () => {
  let resolver!: (value: { user: User }) => void
  firebase.popup.mockReturnValue(new Promise(resolve => { resolver = resolve }))
  firebase.token.mockResolvedValue(token())
  const sessao = criarAutenticacao({} as Auth)
  const entrada = sessao.entrar()
  await Promise.resolve()
  sessao.destruir()
  resolver({ user: { uid: 'uid-ficticio' } as User })
  await entrada
  expect(sessao.identidade.value).toBeNull()
})
