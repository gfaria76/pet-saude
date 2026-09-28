import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ get: vi.fn(), setClaims: vi.fn(), conta: vi.fn(), tx: vi.fn() }))
vi.mock('../../functions/node_modules/firebase-functions/lib/esm/v2/providers/https.mjs', () => ({
  onCall: (_options: unknown, handler: unknown) => handler,
  HttpsError: class extends Error { constructor(public code: string, message: string) { super(message) } }
}))
vi.mock('../../functions/node_modules/firebase-admin/lib/esm/auth/index.js', () => ({ getAuth: () => ({ setCustomUserClaims: mock.setClaims, getUser: mock.conta }) }))
vi.mock('../../functions/node_modules/firebase-admin/lib/esm/firestore/index.js', () => ({ getFirestore: () => ({ doc: () => ({ get: mock.get }), runTransaction: mock.tx }), FieldValue: { serverTimestamp: () => 'server' } }))
import { exigirAcesso, exigirIdentidade, selecionarTenant, gerirVinculo } from '../../functions/src/acesso'
const vinculo = { uid: 'usuario-teste', tenantId: 'municipio-teste', municipioId: 'municipio-teste', perfil: 'ADMIN', microareaIds: [], versaoAcesso: 1, status: 'ATIVO' }
const request = (data = {}) => ({ data, auth: { uid: vinculo.uid, token: { ...vinculo, email: 'usuario-teste@ufms.br', email_verified: true, firebase: { sign_in_provider: 'google.com' } } } })
// Os handlers são desembrulhados pelo mock, sem iniciar servidor nem acessar nuvem.
const selecionar = selecionarTenant as unknown as (r: unknown) => Promise<unknown>
const gerir = gerirVinculo as unknown as (r: unknown) => Promise<unknown>
beforeEach(() => { vi.resetAllMocks(); mock.get.mockResolvedValue({ data: () => vinculo }) })
describe('Backend de vínculos', () => {
  it('rejeita conta externa antes de consultar dados', () => {
    const req = request(); req.auth.token.email = 'externo@example.test'
    expect(() => exigirIdentidade(req as never)).toThrow('institucional')
    expect(mock.get).not.toHaveBeenCalled()
  })
  it('revogação bloqueia imediatamente claims ainda emitidas', async () => {
    mock.get.mockResolvedValue({ data: () => ({ ...vinculo, status: 'INATIVO' }) })
    await expect(exigirAcesso(request() as never)).rejects.toThrow('revogado')
  })
  it('emite somente escopo do vínculo armazenado', async () => {
    await selecionar(request({ tenantId: vinculo.tenantId, perfil: 'MEDICO' }))
    expect(mock.setClaims).toHaveBeenCalledWith(vinculo.uid, { tenantId: vinculo.tenantId, municipioId: vinculo.municipioId, perfil: 'ADMIN', microareaIds: [], versaoAcesso: 1 })
  })
  it('não emite claims de vínculo inativo', async () => {
    mock.get.mockResolvedValue({ data: () => ({ ...vinculo, status: 'INATIVO' }) })
    await expect(selecionar(request({ tenantId: vinculo.tenantId }))).rejects.toThrow('indisponível')
    expect(mock.setClaims).not.toHaveBeenCalled()
  })
  it.each([
    { uid: vinculo.uid, perfil: 'MEDICO', equipeId: 'equipe-teste' },
    { uid: 'outro', perfil: 'ADMIN' },
    { uid: 'outro', perfil: 'MEDICO', equipeId: 'equipe-teste', tenantId: 'outro', municipioId: 'outro' }
  ])('bloqueia autoalteração, promoção a ADMIN e outro município', async alteracao => {
    await expect(gerir(request({ vinculo: { ...vinculo, ...alteracao } }))).rejects.toThrow('não autorizada')
    expect(mock.tx).not.toHaveBeenCalled()
  })
})
