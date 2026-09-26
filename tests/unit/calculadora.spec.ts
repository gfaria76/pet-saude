import { describe, it, expect } from 'vitest'
import {
  calcularEstratificacaoRisco,
  FaixaRisco,
  IndicadorRiscoCodigo,
  TipoSentinela,
  CONFIGURACAO_COELHO_SAVASSI_V1,
  type DadosAvaliacaoEntrada,
  type ConfiguracaoEscalaRisco
} from '../../shared/domain/risk-engine'

describe('Motor de Estratificação de Risco Coelho-Savassi (APS / ESF)', () => {
  it('deve classificar como SEM_RISCO_R0 família sem vulnerabilidades ativas (score = 0)', () => {
    const entrada: DadosAvaliacaoEntrada = {
      familiaId: 'fam-ficticia-001',
      indicadores: [
        { codigo: IndicadorRiscoCodigo.IND_ACAMADO, ativo: false },
        { codigo: IndicadorRiscoCodigo.IND_HIPERTENSAO, ativo: false }
      ]
    }

    const resultado = calcularEstratificacaoRisco(entrada)

    expect(resultado.pontuacaoTotal).toBe(0)
    expect(resultado.classificacao).toBe(FaixaRisco.SEM_RISCO_R0)
    expect(resultado.fatoresDeterminantes).toHaveLength(0)
    expect(resultado.regraDecisao).toContain('Pontuação 0')
  })

  it('deve pontuar corretamente indicador isolado (Acamado = 3 pontos -> R1)', () => {
    const entrada: DadosAvaliacaoEntrada = {
      familiaId: 'fam-ficticia-002',
      indicadores: [
        {
          codigo: IndicadorRiscoCodigo.IND_ACAMADO,
          ativo: true,
          individuoNome: 'Cidadão Fictício A'
        }
      ]
    }

    const resultado = calcularEstratificacaoRisco(entrada)

    expect(resultado.pontuacaoTotal).toBe(3)
    expect(resultado.classificacao).toBe(FaixaRisco.RISCO_MENOR_R1)
    expect(resultado.fatoresDeterminantes).toHaveLength(1)
    expect(resultado.fatoresDeterminantes[0].pontuacaoAtribuida).toBe(3)
    expect(resultado.fatoresDeterminantes[0].tipoSentinela).toBe(TipoSentinela.BIOLOGICO_DEPENDENCIA)
  })

  describe('Limites de corte (Boundary Testing)', () => {
    it('score 4 deve classificar como RISCO_MENOR_R1 (limite superior do R1)', () => {
      const entrada: DadosAvaliacaoEntrada = {
        familiaId: 'fam-ficticia-003',
        indicadores: [
          { codigo: IndicadorRiscoCodigo.IND_ACAMADO, ativo: true }, // 3 pts
          { codigo: IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO, ativo: true } // 1 pt
        ]
      }

      const resultado = calcularEstratificacaoRisco(entrada)

      expect(resultado.pontuacaoTotal).toBe(4)
      expect(resultado.classificacao).toBe(FaixaRisco.RISCO_MENOR_R1)
    })

    it('score 5 deve classificar como RISCO_MEDIO_R2 (limiar inferior do R2)', () => {
      const entrada: DadosAvaliacaoEntrada = {
        familiaId: 'fam-ficticia-004',
        indicadores: [
          { codigo: IndicadorRiscoCodigo.IND_ACAMADO, ativo: true }, // 3 pts
          { codigo: IndicadorRiscoCodigo.IND_DESEMPREGO, ativo: true } // 2 pts
        ]
      }

      const resultado = calcularEstratificacaoRisco(entrada)

      expect(resultado.pontuacaoTotal).toBe(5)
      expect(resultado.classificacao).toBe(FaixaRisco.RISCO_MEDIO_R2)
    })

    it('score 6 deve classificar como RISCO_MEDIO_R2 (limite superior do R2)', () => {
      const entrada: DadosAvaliacaoEntrada = {
        familiaId: 'fam-ficticia-005',
        indicadores: [
          { codigo: IndicadorRiscoCodigo.IND_ACAMADO, ativo: true }, // 3 pts
          { codigo: IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA, ativo: true } // 3 pts
        ]
      }

      const resultado = calcularEstratificacaoRisco(entrada)

      expect(resultado.pontuacaoTotal).toBe(6)
      expect(resultado.classificacao).toBe(FaixaRisco.RISCO_MEDIO_R2)
    })

    it('score 7 deve classificar como RISCO_MAIOR_R3 (limiar de Risco Máximo)', () => {
      const entrada: DadosAvaliacaoEntrada = {
        familiaId: 'fam-ficticia-006',
        indicadores: [
          { codigo: IndicadorRiscoCodigo.IND_ACAMADO, ativo: true }, // 3 pts
          { codigo: IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA, ativo: true }, // 3 pts
          { codigo: IndicadorRiscoCodigo.IND_DIABETES, ativo: true } // 1 pt
        ]
      }

      const resultado = calcularEstratificacaoRisco(entrada)

      expect(resultado.pontuacaoTotal).toBe(7)
      expect(resultado.classificacao).toBe(FaixaRisco.RISCO_MAIOR_R3)
    })
  })

  it('deve garantir explicabilidade matemática absoluta (soma dos fatores = pontuação total)', () => {
    const entrada: DadosAvaliacaoEntrada = {
      familiaId: 'fam-ficticia-007',
      indicadores: [
        { codigo: IndicadorRiscoCodigo.IND_DROGADICAO, ativo: true }, // 2
        { codigo: IndicadorRiscoCodigo.IND_ANALFABETISMO, ativo: true }, // 1
        { codigo: IndicadorRiscoCodigo.IND_HIPERTENSAO, ativo: true }, // 1
        { codigo: IndicadorRiscoCodigo.IND_MAIOR_70_ANOS, ativo: true }, // 1
        { codigo: IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO, ativo: true } // 1
      ]
    }

    const resultado = calcularEstratificacaoRisco(entrada)

    expect(resultado.pontuacaoTotal).toBe(6)
    const somaItens = resultado.fatoresDeterminantes.reduce((sum, f) => sum + f.pontuacaoAtribuida, 0)
    expect(somaItens).toBe(resultado.pontuacaoTotal)
  })

  describe('Delta histórico com avaliação anterior', () => {
    it('deve registrar AGRAVAMENTO quando a família adquire novo fator de risco', () => {
      const entrada: DadosAvaliacaoEntrada = {
        familiaId: 'fam-ficticia-008',
        indicadores: [
          { codigo: IndicadorRiscoCodigo.IND_HIPERTENSAO, ativo: true }, // 1 pt
          { codigo: IndicadorRiscoCodigo.IND_ACAMADO, ativo: true } // +3 pts
        ],
        avaliacaoAnterior: {
          id: 'aval-ant-01',
          data: '2026-01-10T10:00:00Z',
          pontuacao: 1,
          classificacao: FaixaRisco.RISCO_MENOR_R1,
          fatores: [
            {
              indicadorCodigo: IndicadorRiscoCodigo.IND_HIPERTENSAO,
              descricao: 'Hipertensão arterial sistêmica',
              pontuacaoAtribuida: 1,
              tipoSentinela: TipoSentinela.BIOLOGICO_CRONICO
            }
          ]
        }
      }

      const resultado = calcularEstratificacaoRisco(entrada)

      expect(resultado.pontuacaoTotal).toBe(4)
      expect(resultado.comparativoAvaliacaoAnterior).toBeDefined()
      expect(resultado.comparativoAvaliacaoAnterior?.variacaoPontos).toBe(+3)
      expect(resultado.comparativoAvaliacaoAnterior?.evolucaoRisco).toBe('AGRAVAMENTO')
      expect(resultado.comparativoAvaliacaoAnterior?.fatoresAdicionados).toHaveLength(1)
      expect(resultado.comparativoAvaliacaoAnterior?.fatoresAdicionados[0].indicadorCodigo).toBe(
        IndicadorRiscoCodigo.IND_ACAMADO
      )
      expect(resultado.comparativoAvaliacaoAnterior?.fatoresResolvidos).toHaveLength(0)
    })

    it('deve registrar MELHORIA quando um fator de risco é resolvido', () => {
      const entrada: DadosAvaliacaoEntrada = {
        familiaId: 'fam-ficticia-009',
        indicadores: [
          { codigo: IndicadorRiscoCodigo.IND_HIPERTENSAO, ativo: true } // permaneceu
        ],
        avaliacaoAnterior: {
          id: 'aval-ant-02',
          data: '2026-02-10T10:00:00Z',
          pontuacao: 3,
          classificacao: FaixaRisco.RISCO_MENOR_R1,
          fatores: [
            {
              indicadorCodigo: IndicadorRiscoCodigo.IND_HIPERTENSAO,
              descricao: 'Hipertensão arterial sistêmica',
              pontuacaoAtribuida: 1,
              tipoSentinela: TipoSentinela.BIOLOGICO_CRONICO
            },
            {
              indicadorCodigo: IndicadorRiscoCodigo.IND_DESEMPREGO,
              descricao: 'Desemprego do provedor familiar',
              pontuacaoAtribuida: 2,
              tipoSentinela: TipoSentinela.SOCIAL_ECONOMICO
            }
          ]
        }
      }

      const resultado = calcularEstratificacaoRisco(entrada)

      expect(resultado.pontuacaoTotal).toBe(1)
      expect(resultado.comparativoAvaliacaoAnterior?.variacaoPontos).toBe(-2)
      expect(resultado.comparativoAvaliacaoAnterior?.evolucaoRisco).toBe('MELHORIA')
      expect(resultado.comparativoAvaliacaoAnterior?.fatoresResolvidos).toHaveLength(1)
      expect(resultado.comparativoAvaliacaoAnterior?.fatoresResolvidos[0].indicadorCodigo).toBe(
        IndicadorRiscoCodigo.IND_DESEMPREGO
      )
    })
  })

  it('deve suportar escala configurável customizada (e.g. protocolo municipal de Coxim)', () => {
    // Exemplo: Município redefine peso de saneamento inadequado para 2 em vez de 1
    const configCustomizada: ConfiguracaoEscalaRisco = {
      ...CONFIGURACAO_COELHO_SAVASSI_V1,
      versao: 'COXIM_2026_CUSTOM',
      pesos: {
        ...CONFIGURACAO_COELHO_SAVASSI_V1.pesos,
        [IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO]: 2
      }
    }

    const entrada: DadosAvaliacaoEntrada = {
      familiaId: 'fam-ficticia-010',
      indicadores: [
        { codigo: IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO, ativo: true }
      ]
    }

    const resultado = calcularEstratificacaoRisco(entrada, configCustomizada)

    expect(resultado.versaoEscala).toBe('COXIM_2026_CUSTOM')
    expect(resultado.pontuacaoTotal).toBe(2) // peso customizado aplicado!
    expect(resultado.fatoresDeterminantes[0].pontuacaoAtribuida).toBe(2)
  })
})
