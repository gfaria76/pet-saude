/** Regras multi-tenant: dados inteiramente sintéticos, nenhuma escrita cliente. */
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarRepositorioFamilias } from '../../app/repositories/familias'
import { claimsAcessoSchema } from '../../shared/domain/acesso'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'

const identidade = { email: 'profissional.ficticio@ufms.br', email_verified: true, firebase: { sign_in_provider: 'google.com', identities: {} } }
const base = { tenantId: 'coxim', municipioId: 'coxim', versaoAcesso: 1 }
const perfis = {
  acs: { ...base, perfil: 'ACS', equipeId: 'ESF-01', microareaIds: ['MA-01'] },
  enfermeiro: { ...base, perfil: 'ENFERMEIRO', equipeId: 'ESF-01', microareaIds: [] },
  coordenador: { ...base, perfil: 'COORDENADOR_APS', microareaIds: [] },
  admin: { ...base, perfil: 'ADMIN', microareaIds: [] }
}
let env: RulesTestEnvironment
const db = (uid: keyof typeof perfis) => env.authenticatedContext(uid, { ...identidade, ...perfis[uid] }).firestore()
const caminho = (colecao: string, id = '1') => `tenants/coxim/${colecao}/${id}`
const clinicas = ['familias', 'domicilios', 'individuos', 'avaliacoes_risco']

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-pet-saude', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
afterAll(async () => { await env?.cleanup() })
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async ctx => {
    const fs = ctx.firestore()
    for (const [uid, p] of Object.entries(perfis)) {
      await setDoc(doc(fs, caminho('vinculos', uid)), { ...p, uid, status: 'ATIVO' })
    }
    for (const tenant of ['coxim', 'corumba']) {
      await setDoc(doc(fs, `tenants/${tenant}`), { municipioId: tenant, nome: `Município fictício ${tenant}` })
      for (const colecao of [...clinicas, 'microareas', 'logs_auditoria']) {
        for (const [id, equipeId, microareaId] of [['1', 'ESF-01', 'MA-01'], ['2', 'ESF-01', 'MA-02'], ['3', 'ESF-02', 'MA-03']]) {
          await setDoc(doc(fs, `tenants/${tenant}/${colecao}/${id}`), { municipioId: tenant, equipeId, microareaId })
        }
      }
    }
    await setDoc(doc(fs, 'familias/legado'), { municipioId: 'coxim' })
  })
})

describe('Identidade e vínculo vigente', () => {
  it('nega não autenticado e institucional sem vínculo', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), caminho('familias'))))
    await assertFails(getDoc(doc(env.authenticatedContext('sem-vinculo', identidade).firestore(), caminho('familias'))))
  })
  it.each([
    { email: 'ficticio@gmail.com' }, { email: 'ficticio@ufms.br.evil.test' },
    { email: 'ficticio@sub.ufms.br' }, { email: 'ficticio@ufms.br ' },
    { email: null }, { email_verified: false },
    { firebase: { sign_in_provider: 'password', identities: {} } },
    { perfil: 'ADMIN' }, { perfil: 'DESCONHECIDO' }, { tenantId: 'corumba' },
    { municipioId: '' }, { equipeId: 'ESF-02' }, { microareaIds: ['MA-01', 'MA-02'] },
    { versaoAcesso: 2 }
  ])('nega token inválido ou divergente do vínculo: %j', async alteracao => {
    const fs = env.authenticatedContext('acs', { ...identidade, ...perfis.acs, ...alteracao }).firestore()
    await assertFails(getDoc(doc(fs, caminho('familias'))))
    await assertFails(getDoc(doc(fs, caminho('microareas'))))
  })
  it('aceita domínio institucional em maiúsculas', async () => {
    const fs = env.authenticatedContext('acs', { ...identidade, ...perfis.acs, email: 'ficticio@UFMS.BR' }).firestore()
    await assertSucceeds(getDoc(doc(fs, caminho('familias'))))
  })
  it.each([{ status: 'INATIVO' }, { versaoAcesso: 2 }])('revogação invalida token já emitido: %j', async alteracao => {
    const fs = db('acs')
    await assertSucceeds(getDoc(doc(fs, caminho('familias'))))
    await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), caminho('vinculos', 'acs')), alteracao))
    await assertFails(getDoc(doc(fs, caminho('familias'))))
  })
  it('usuário só consulta seu vínculo, não lista nem se promove', async () => {
    await assertSucceeds(getDoc(doc(db('acs'), caminho('vinculos', 'acs'))))
    await assertFails(getDoc(doc(db('acs'), caminho('vinculos', 'admin'))))
    await assertFails(getDocs(collection(db('admin'), 'tenants/coxim/vinculos')))
    await assertFails(updateDoc(doc(db('acs'), caminho('vinculos', 'acs')), { perfil: 'ADMIN' }))
    await assertFails(setDoc(doc(db('admin'), caminho('vinculos', 'outro')), { ...perfis.admin, uid: 'outro', status: 'ATIVO' }))
  })
})

describe('Isolamento territorial', () => {
  it('pagina famílias sem duplicar e mantém o filtro da microárea', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      const fs = ctx.firestore()
      for (const id of ['1', '2', '3']) await deleteDoc(doc(fs, caminho('familias', id)))
      for (let i = 0; i < 6; i++) {
        const id = `pagina-${i}`
        await setDoc(doc(fs, caminho('familias', id)), {
          id, municipioId: 'coxim', equipeId: 'ESF-01', microareaId: i === 5 ? 'MA-02' : 'MA-01',
          prontuarioFamiliar: `FICTICIO-${i}`, domicilioId: 'dom-ficticio', responsavelId: 'pessoa-ficticia',
          responsavelNome: 'Pessoa Fictícia', quantidadeMembros: 1, status: 'ATIVA',
          ultimaClassificacaoRisco: 'SEM_RISCO_R0', ultimaPontuacaoRisco: 0, versaoCadastro: 0
        })
      }
    })
    const repo = criarRepositorioFamilias(db('acs'), claimsAcessoSchema.parse(perfis.acs))
    const primeira = await repo.listarPagina({ tamanho: 2 })
    const segunda = await repo.listarPagina({ tamanho: 2, apos: primeira.proximo! })
    const terceira = await repo.listarPagina({ tamanho: 2, apos: segunda.proximo! })
    expect([...primeira.familias, ...segunda.familias, ...terceira.familias].map(f => f.id))
      .toEqual(['pagina-0', 'pagina-1', 'pagina-2', 'pagina-3', 'pagina-4'])
    expect(terceira.proximo).toBeNull()
    await expect(repo.listarPagina({ tamanho: 500 })).rejects.toThrow()
    await expect(repo.listarPagina({ apos: 'outro/caminho' })).rejects.toThrow()
  })
  it.each(clinicas)('%s respeita município, equipe e microárea; ADMIN não acessa saúde', async colecao => {
    await assertSucceeds(getDoc(doc(db('acs'), caminho(colecao))))
    await assertFails(getDoc(doc(db('acs'), caminho(colecao, '2'))))
    await assertSucceeds(getDoc(doc(db('enfermeiro'), caminho(colecao, '2'))))
    await assertFails(getDoc(doc(db('enfermeiro'), caminho(colecao, '3'))))
    await assertSucceeds(getDoc(doc(db('coordenador'), caminho(colecao, '3'))))
    await assertFails(getDoc(doc(db('admin'), caminho(colecao))))
    await assertFails(getDoc(doc(db('coordenador'), `tenants/corumba/${colecao}/1`)))
  })
  it('listagem clínica exige filtro compatível com escopo', async () => {
    const col = collection(db('acs'), 'tenants/coxim/familias')
    await assertSucceeds(getDocs(query(col, where('municipioId', '==', 'coxim'), where('equipeId', '==', 'ESF-01'), where('microareaId', 'in', ['MA-01']))))
    await assertFails(getDocs(col))
    await assertFails(getDocs(query(col, where('municipioId', '==', 'coxim'))))
  })
  it.each(['admin', 'coordenador'] as const)('%s consulta apenas auditoria municipal', async perfil => {
    const fs = db(perfil)
    await assertSucceeds(getDoc(doc(fs, caminho('logs_auditoria'))))
    await assertSucceeds(getDocs(query(collection(fs, 'tenants/coxim/logs_auditoria'), where('municipioId', '==', 'coxim'))))
    await assertFails(getDoc(doc(fs, 'tenants/corumba/logs_auditoria/1')))
  })
  it('ACS não consulta auditoria', async () => {
    await assertFails(getDoc(doc(db('acs'), caminho('logs_auditoria'))))
  })
})

describe('Escritas exclusivas do backend', () => {
  it.each(['operacoes', 'operacoes_cadastro'])('%s não permite leitura direta nem ao autor', async colecao => {
    await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), caminho(colecao)), { uid: 'acs', municipioId: 'coxim' }))
    await assertFails(getDoc(doc(db('acs'), caminho(colecao))))
    await assertFails(getDocs(collection(db('coordenador'), `tenants/coxim/${colecao}`)))
  })
  it.each([...clinicas, 'microareas', 'logs_auditoria', 'operacoes', 'operacoes_cadastro'])('%s nega create/update/delete mesmo à coordenação', async colecao => {
    const fs = db('coordenador')
    await assertFails(setDoc(doc(fs, caminho(colecao, 'nova')), { municipioId: 'coxim' }))
    await assertFails(updateDoc(doc(fs, caminho(colecao)), { municipioId: 'corumba' }))
    await assertFails(deleteDoc(doc(fs, caminho(colecao))))
  })
  it('nega coleções legadas e desconhecidas', async () => {
    await assertFails(getDoc(doc(db('admin'), 'familias/legado')))
    await assertFails(setDoc(doc(db('admin'), 'qualquer/1'), { perfil: 'ADMIN' }))
  })
})
