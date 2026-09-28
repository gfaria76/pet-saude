import { describe, expect, it } from 'vitest'
import { claimsAcessoSchema, vinculoSchema, vinculoVigente } from '../../shared/domain/acesso'
const base = { uid: 'uid-ficticio', tenantId: 'municipio-teste', municipioId: 'municipio-teste', perfil: 'ACS', equipeId: 'equipe-teste', microareaIds: ['microarea-teste'], versaoAcesso: 1, status: 'ATIVO' }
describe('Vínculos institucionais', () => {
  it('exige território e IDs seguros, sem inventar perfis', () => {
    for (const alteracao of [{ tenantId: 'outro' }, { perfil: 'ESTUDANTE' }, { microareaIds: [] }, { equipeId: undefined }, { uid: '../usuario' }, { microareaIds: [''] }, { microareaIds: ['m', 'm'] }]) {
      expect(vinculoSchema.safeParse({ ...base, ...alteracao }).success).toBe(false)
    }
  })
  it('aceita ADMIN sem equipe mas conserva município obrigatório', () => {
    expect(vinculoSchema.safeParse({ ...base, perfil: 'ADMIN', equipeId: undefined, microareaIds: [] }).success).toBe(true)
  })
  it('rejeita tokens antigos depois de revogação ou mudança de território/perfil', () => {
    const claims = claimsAcessoSchema.parse(base)
    const vinculo = vinculoSchema.parse(base)
    expect(vinculoVigente(claims, vinculo, base.uid)).toBe(true)
    expect(vinculoVigente(claims, vinculo, 'outro')).toBe(false)
    for (const alteracao of [{ status: 'INATIVO' }, { versaoAcesso: 2 }, { equipeId: 'outra' }, { microareaIds: ['outra'] }, { perfil: 'MEDICO' }]) {
      expect(vinculoVigente(claims, vinculoSchema.parse({ ...base, ...alteracao }), base.uid)).toBe(false)
    }
  })
  it('claims emitidas removem UID e status e rejeitam versões inválidas', () => {
    const claims = claimsAcessoSchema.parse(base)
    expect(claims).not.toHaveProperty('uid')
    expect(claims).not.toHaveProperty('status')
    expect(claimsAcessoSchema.safeParse({ ...base, versaoAcesso: 0 }).success).toBe(false)
  })
})
