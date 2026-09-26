import { describe, it, expect } from 'vitest'
import {
  calcularEstratificacaoRisco,
  IndicadorRiscoCodigo,
  PerfilProfissional
} from '../../shared/domain/risk-engine'
import {
  AvaliacaoRiscoSchema,
  FamiliaSchema,
  IndividuoSchema,
  LogAuditoriaSchema,
  montarDocumentoAvaliacao
} from '../../shared/domain/schemas'

// Dados 100% sintéticos.
const TERRITORIO = { municipioId: 'coxim', equipeId: 'ESF-01', microareaId: 'MA-01' }

const resultado = calcularEstratificacaoRisco(
  {
    familiaId: 'fam-ficticia-001',
    indicadores: [
      { codigo: IndicadorRiscoCodigo.IND_ACAMADO, ativo: true, individuoId: 'ind-ficticio-1' },
      { codigo: IndicadorRiscoCodigo.IND_HIPERTENSAO, ativo: true }
    ]
  },
  { dataAvaliacao: '2026-09-26T10:00:00.000Z', avaliadorId: 'uid-acs-ficticio', avaliadorPerfil: PerfilProfissional.ACS }
)

const dadosDoc = { familiaId: 'fam-ficticia-001', avaliadorNome: 'ACS Fictício', territorio: TERRITORIO }

describe('AvaliacaoRiscoSchema', () => {
  it('aceita o documento montado a partir do motor', () => {
    const docAvaliacao = montarDocumentoAvaliacao(resultado, dadosDoc)
    expect(docAvaliacao.pontuacaoTotal).toBe(resultado.pontuacaoTotal)
    expect(docAvaliacao.avaliadorId).toBe('uid-acs-ficticio')
    expect(docAvaliacao.microareaId).toBe('MA-01')
  })

  it('rejeita soma dos fatores diferente da pontuação total', () => {
    const docAvaliacao = montarDocumentoAvaliacao(resultado, dadosDoc)
    const r = AvaliacaoRiscoSchema.safeParse({ ...docAvaliacao, pontuacaoTotal: docAvaliacao.pontuacaoTotal + 1 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toContain('invariante de explicabilidade')
  })

  it('exige avaliador e território', () => {
    const { avaliadorId: _, microareaId: __, ...incompleto } = montarDocumentoAvaliacao(resultado, dadosDoc)
    expect(AvaliacaoRiscoSchema.safeParse(incompleto).success).toBe(false)
  })

  it('não carrega nome de indivíduo nos fatores (minimização)', () => {
    const docAvaliacao = montarDocumentoAvaliacao(resultado, dadosDoc)
    for (const fator of docAvaliacao.fatoresDeterminantes) {
      expect(fator).not.toHaveProperty('individuoNome')
    }
  })
})

describe('IndividuoSchema', () => {
  const individuo = {
    ...TERRITORIO,
    id: 'ind-ficticio-1',
    familiaId: 'fam-ficticia-001',
    nome: 'Cidadão Teste',
    dataNascimento: '1950-03-15',
    sexo: 'FEMININO',
    parentesco: 'Mãe',
    condicoesCronicas: {
      hipertenso: true, diabetico: false, acamado: true, deficienciaFisica: false,
      deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false
    }
  }

  it('CNS e CPF são opcionais', () => {
    expect(IndividuoSchema.safeParse(individuo).success).toBe(true)
  })

  it('valida formato de CNS quando informado', () => {
    expect(IndividuoSchema.safeParse({ ...individuo, cns: '123' }).success).toBe(false)
  })

  it('rejeita data de nascimento inválida', () => {
    expect(IndividuoSchema.safeParse({ ...individuo, dataNascimento: '1950-02-31' }).success).toBe(false)
  })
})

describe('FamiliaSchema', () => {
  it('aceita contato opcional previsto no Relatório Técnico', () => {
    const r = FamiliaSchema.safeParse({
      ...TERRITORIO,
      id: 'fam-ficticia-001',
      prontuarioFamiliar: 'CX-0001',
      domicilioId: 'dom-ficticio-1',
      responsavelNome: 'Família Silva Exemplo',
      responsavelId: 'ind-ficticio-1',
      contato: '(67) 90000-0000',
      status: 'ATIVA',
      quantidadeMembros: 3,
      ultimaClassificacaoRisco: 'SEM_RISCO_R0',
      ultimaPontuacaoRisco: 0
    })
    expect(r.success).toBe(true)
  })
})

describe('LogAuditoriaSchema', () => {
  const log = {
    usuarioId: 'uid-acs-ficticio',
    perfil: 'ACS',
    municipioId: 'coxim',
    acao: 'CRIAR_AVALIACAO_RISCO',
    recursoTipo: 'AVALIACAO_RISCO',
    recursoId: 'hash-aval-001',
    dataHora: '2026-09-26T10:00:00.000-04:00'
  }

  it('aceita log válido', () => {
    expect(LogAuditoriaSchema.safeParse(log).success).toBe(true)
  })

  it('rejeita ação fora do catálogo', () => {
    expect(LogAuditoriaSchema.safeParse({ ...log, acao: 'APAGAR_TUDO' }).success).toBe(false)
  })

  it('descarta campos extras (ex.: nome do paciente)', () => {
    const r = LogAuditoriaSchema.parse({ ...log, nomePaciente: 'Maria Fictícia dos Santos' })
    expect(r).not.toHaveProperty('nomePaciente')
  })
})
