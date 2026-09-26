/**
 * Testes das regras do Firestore (RBAC territorial e imutabilidade).
 * Rodar com `pnpm test:rules` (sobe o Emulator). Somente dados sintéticos.
 */
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore'

const TERR_MA01 = { municipioId: 'coxim', equipeId: 'ESF-01', microareaId: 'MA-01' }
const TERR_MA02 = { municipioId: 'coxim', equipeId: 'ESF-01', microareaId: 'MA-02' }

const CLAIMS = {
  acs: { perfil: 'ACS', municipioId: 'coxim', equipeId: 'ESF-01', microareaIds: ['MA-01'], name: 'ACS Fictício' },
  enfermeiro: { perfil: 'ENFERMEIRO', municipioId: 'coxim', equipeId: 'ESF-01', name: 'Enfermeira Fictícia' },
  coordenador: { perfil: 'COORDENADOR_APS', municipioId: 'coxim', name: 'Coordenação Fictícia' },
  admin: { perfil: 'ADMIN', municipioId: 'coxim' },
  acsCorumba: { perfil: 'ACS', municipioId: 'corumba', equipeId: 'ESF-09', microareaIds: ['MA-01'] }
}

let env: RulesTestEnvironment

function domicilio(id: string, terr = TERR_MA01) {
  return {
    id,
    ...terr,
    logradouro: 'Rua Exemplo',
    numero: '100',
    bairro: 'Centro Fictício',
    quantidadeComodos: 4,
    quantidadeMoradores: 3,
    abastecimentoAgua: 'REDE_ENCANADA',
    esgotamentoSanitario: 'REDE_COLETORA',
    destinoLixo: 'COLETADO',
    saneamentoInadequado: false,
    adensamentoExcessivo: false
  }
}

function familia(id: string, domicilioId: string, terr = TERR_MA01) {
  return {
    id,
    ...terr,
    prontuarioFamiliar: `PF-${id}`,
    domicilioId,
    responsavelNome: 'Família Silva Exemplo',
    responsavelId: `ind-${id}`,
    status: 'ATIVA',
    quantidadeMembros: 3,
    ultimaClassificacaoRisco: 'SEM_RISCO_R0',
    ultimaPontuacaoRisco: 0
  }
}

function avaliacao(familiaId: string, avaliadorId: string, extras: Record<string, unknown> = {}) {
  return {
    familiaId,
    ...TERR_MA01,
    avaliadorId,
    avaliadorNome: 'ACS Fictício',
    avaliadorPerfil: 'ACS',
    dataAvaliacao: '2026-09-26T10:00:00.000Z',
    versaoEscala: 'COELHO_SAVASSI_V1',
    pontuacaoTotal: 3,
    classificacao: 'RISCO_MENOR_R1',
    regraDecisao: 'Pontuação de 3 pontos (1 a 4) define Risco Menor (R1).',
    fatoresDeterminantes: [
      { indicadorCodigo: 'IND_ACAMADO', descricao: 'Pessoa acamada no domicílio', pontuacaoAtribuida: 3, tipoSentinela: 'BIOLOGICO_DEPENDENCIA' }
    ],
    registradoEm: serverTimestamp(),
    ...extras
  }
}

function log(usuarioId: string, perfil: string, extras: Record<string, unknown> = {}) {
  return {
    usuarioId,
    perfil,
    municipioId: 'coxim',
    acao: 'CRIAR_AVALIACAO_RISCO',
    recursoTipo: 'AVALIACAO_RISCO',
    recursoId: 'hash-aval-001',
    dataHora: '2026-09-26T10:00:00.000Z',
    registradoEm: serverTimestamp(),
    ...extras
  }
}

const db = (uid: keyof typeof CLAIMS) => env.authenticatedContext(uid, CLAIMS[uid]).firestore()

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pet-saude',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') }
  })
})

afterAll(async () => {
  await env?.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore()
    await setDoc(doc(fs, 'domicilios/dom-1'), domicilio('dom-1'))
    await setDoc(doc(fs, 'domicilios/dom-2'), domicilio('dom-2', TERR_MA02))
    await setDoc(doc(fs, 'familias/fam-1'), familia('fam-1', 'dom-1'))
    await setDoc(doc(fs, 'familias/fam-2'), familia('fam-2', 'dom-2', TERR_MA02))
    await setDoc(doc(fs, 'avaliacoes_risco/aval-1'), { ...avaliacao('fam-1', 'acs'), registradoEm: new Date() })
    await setDoc(doc(fs, 'logs_auditoria/log-1'), { ...log('acs', 'ACS'), registradoEm: new Date() })
  })
})

describe('Autenticação e perfis', () => {
  it('nega qualquer leitura sem autenticação', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'familias/fam-1')))
  })

  it('nega usuário autenticado sem custom claims', async () => {
    await assertFails(getDoc(doc(env.authenticatedContext('sem-claims').firestore(), 'familias/fam-1')))
  })

  it('ADMIN não acessa dados de saúde', async () => {
    await assertFails(getDoc(doc(db('admin'), 'familias/fam-1')))
    await assertFails(getDoc(doc(db('admin'), 'avaliacoes_risco/aval-1')))
  })

  it('nega coleções não declaradas', async () => {
    await assertFails(setDoc(doc(db('coordenador'), 'qualquer/x'), { a: 1 }))
  })
})

describe('Escopo territorial', () => {
  it('ACS lê família da sua microárea', async () => {
    await assertSucceeds(getDoc(doc(db('acs'), 'familias/fam-1')))
  })

  it('ACS não lê família de outra microárea', async () => {
    await assertFails(getDoc(doc(db('acs'), 'familias/fam-2')))
  })

  it('ACS de outro município não lê', async () => {
    await assertFails(getDoc(doc(db('acsCorumba'), 'familias/fam-1')))
  })

  it('profissional da eSF lê toda a equipe', async () => {
    await assertSucceeds(getDoc(doc(db('enfermeiro'), 'familias/fam-2')))
  })

  it('ACS lista com filtro territorial e é negado sem filtro', async () => {
    const col = collection(db('acs'), 'familias')
    await assertSucceeds(getDocs(query(col,
      where('municipioId', '==', 'coxim'),
      where('equipeId', '==', 'ESF-01'),
      where('microareaId', 'in', ['MA-01']))))
    await assertFails(getDocs(col))
  })
})

describe('Famílias', () => {
  it('ACS atualiza status (exclusão lógica)', async () => {
    await assertSucceeds(updateDoc(doc(db('acs'), 'familias/fam-1'), { status: 'MUDOU_SE' }))
  })

  it('ACS não transfere família de microárea', async () => {
    await assertFails(updateDoc(doc(db('acs'), 'familias/fam-1'), { microareaId: 'MA-02' }))
  })

  it('ninguém apaga família fisicamente', async () => {
    await assertFails(deleteDoc(doc(db('coordenador'), 'familias/fam-1')))
  })

  it('rejeita campo não previsto no schema', async () => {
    await assertFails(updateDoc(doc(db('acs'), 'familias/fam-1'), { extra: 'x' }))
  })

  it('rejeita família cujo domicílio está em outro território', async () => {
    await assertFails(setDoc(doc(db('acs'), 'familias/fam-3'), familia('fam-3', 'dom-2')))
  })

  it('rejeita string gigante (DoS)', async () => {
    await assertFails(updateDoc(doc(db('acs'), 'familias/fam-1'), { responsavelNome: 'x'.repeat(10_000) }))
  })
})

describe('Avaliações de risco (append-only)', () => {
  it('ACS cria avaliação válida da sua família', async () => {
    await assertSucceeds(setDoc(doc(db('acs'), 'avaliacoes_risco/aval-2'), avaliacao('fam-1', 'acs')))
  })

  it('não permite forjar o avaliador', async () => {
    await assertFails(setDoc(doc(db('acs'), 'avaliacoes_risco/aval-3'), avaliacao('fam-1', 'outro-uid')))
  })

  it('não permite perfil diferente do claim', async () => {
    await assertFails(setDoc(doc(db('acs'), 'avaliacoes_risco/aval-3'),
      avaliacao('fam-1', 'acs', { avaliadorPerfil: 'MEDICO' })))
  })

  it('não permite registradoEm diferente do horário do servidor', async () => {
    await assertFails(setDoc(doc(db('acs'), 'avaliacoes_risco/aval-3'),
      avaliacao('fam-1', 'acs', { registradoEm: new Date('2020-01-01') })))
  })

  it('não permite avaliar família de outro território declarando território falso', async () => {
    await assertFails(setDoc(doc(db('acs'), 'avaliacoes_risco/aval-3'), avaliacao('fam-2', 'acs')))
  })

  it('resumo de risco da família só muda junto com a nova avaliação (mesmo batch)', async () => {
    const fs = db('acs')
    const lote = writeBatch(fs)
    lote.set(doc(fs, 'avaliacoes_risco/aval-novo'), avaliacao('fam-1', 'acs'))
    lote.update(doc(fs, 'familias/fam-1'), {
      ultimaClassificacaoRisco: 'RISCO_MENOR_R1',
      ultimaPontuacaoRisco: 3,
      dataUltimaAvaliacao: '2026-09-26T10:00:00.000Z',
      ultimaAvaliacaoId: 'aval-novo'
    })
    await assertSucceeds(lote.commit())
  })

  it('nega alterar o resumo de risco da família sem avaliação', async () => {
    await assertFails(updateDoc(doc(db('acs'), 'familias/fam-1'), {
      ultimaClassificacaoRisco: 'RISCO_MAIOR_R3',
      ultimaPontuacaoRisco: 9
    }))
  })

  it('nega apontar o resumo para uma avaliação antiga já existente', async () => {
    await assertFails(updateDoc(doc(db('acs'), 'familias/fam-1'), {
      ultimaClassificacaoRisco: 'RISCO_MENOR_R1',
      ultimaPontuacaoRisco: 3,
      dataUltimaAvaliacao: '2026-09-26T10:00:00.000Z',
      ultimaAvaliacaoId: 'aval-1'
    }))
  })

  it('nega resumo divergente da avaliação criada no batch', async () => {
    const fs = db('acs')
    const lote = writeBatch(fs)
    lote.set(doc(fs, 'avaliacoes_risco/aval-novo'), avaliacao('fam-1', 'acs'))
    lote.update(doc(fs, 'familias/fam-1'), {
      ultimaClassificacaoRisco: 'SEM_RISCO_R0',
      ultimaPontuacaoRisco: 0,
      dataUltimaAvaliacao: '2026-09-26T10:00:00.000Z',
      ultimaAvaliacaoId: 'aval-novo'
    })
    await assertFails(lote.commit())
  })

  it('família nova precisa nascer com resumo R0 / 0 pontos', async () => {
    await assertSucceeds(setDoc(doc(db('acs'), 'familias/fam-9'), familia('fam-9', 'dom-1')))
    await assertFails(setDoc(doc(db('acs'), 'familias/fam-8'),
      { ...familia('fam-8', 'dom-1'), ultimaClassificacaoRisco: 'RISCO_MAIOR_R3', ultimaPontuacaoRisco: 9 }))
  })

  it('nega update e delete de avaliação', async () => {
    await assertFails(updateDoc(doc(db('acs'), 'avaliacoes_risco/aval-1'), { pontuacaoTotal: 0 }))
    await assertFails(deleteDoc(doc(db('coordenador'), 'avaliacoes_risco/aval-1')))
  })
})

describe('Auditoria (append-only)', () => {
  it('usuário registra log próprio', async () => {
    await assertSucceeds(setDoc(doc(db('acs'), 'logs_auditoria/log-2'), log('acs', 'ACS')))
  })

  it('não registra log em nome de outro usuário', async () => {
    await assertFails(setDoc(doc(db('acs'), 'logs_auditoria/log-3'), log('outro', 'ACS')))
  })

  it('nega update e delete de log', async () => {
    await assertFails(updateDoc(doc(db('coordenador'), 'logs_auditoria/log-1'), { acao: 'CONSULTAR_FAMILIA' }))
    await assertFails(deleteDoc(doc(db('admin'), 'logs_auditoria/log-1')))
  })

  it('só coordenação e ADMIN leem logs', async () => {
    await assertFails(getDoc(doc(db('acs'), 'logs_auditoria/log-1')))
    await assertSucceeds(getDoc(doc(db('coordenador'), 'logs_auditoria/log-1')))
    await assertSucceeds(getDoc(doc(db('admin'), 'logs_auditoria/log-1')))
  })
})
