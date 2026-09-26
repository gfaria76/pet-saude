import { describe, it, expect } from 'vitest'
import {
  calcularEstratificacaoRisco,
  CONFIGURACAO_COELHO_SAVASSI_V1,
  FaixaRisco,
  IndicadorRiscoCodigo,
  METADADOS_INDICADORES,
  PerfilProfissional,
  TipoSentinela,
  type ConfiguracaoEscalaRisco,
  type ContextoAvaliacao,
  type DadosAvaliacaoEntrada,
  type FatorDeterminanteRisco,
  type ItemIndicadorEntrada
} from '../../shared/domain/risk-engine'

// Dados 100% sintéticos. A escala sob teste é a vigente; valores esperados
// são derivados dela, não escritos "de cabeça".
const ESCALA = CONFIGURACAO_COELHO_SAVASSI_V1
const PESOS = ESCALA.pesos
const { menorR1Minimo, medioR2Minimo, maiorR3Minimo } = ESCALA.limitesCorte
const TODOS_CODIGOS = Object.values(IndicadorRiscoCodigo)

const CONTEXTO: ContextoAvaliacao = {
  dataAvaliacao: '2026-09-26T10:00:00.000Z',
  avaliadorId: 'uid-acs-ficticio',
  avaliadorPerfil: PerfilProfissional.ACS
}

const ativo = (codigo: IndicadorRiscoCodigo, individuoId?: string): ItemIndicadorEntrada =>
  ({ codigo, ativo: true, individuoId })

const entradaCom = (indicadores: ItemIndicadorEntrada[], extras: Partial<DadosAvaliacaoEntrada> = {}): DadosAvaliacaoEntrada =>
  ({ familiaId: 'fam-ficticia-001', indicadores, ...extras })

const calcular = (indicadores: ItemIndicadorEntrada[], configuracao: ConfiguracaoEscalaRisco = ESCALA) =>
  calcularEstratificacaoRisco(entradaCom(indicadores), CONTEXTO, configuracao)

/** Monta uma escala sintética com o mesmo conjunto de indicadores e pesos arbitrários. */
function escalaTeste(pesos: Partial<Record<IndicadorRiscoCodigo, number | null>>, extras: Partial<ConfiguracaoEscalaRisco> = {}): ConfiguracaoEscalaRisco {
  return { ...ESCALA, versao: 'ESCALA_TESTE', pesos: { ...PESOS, ...pesos }, ...extras }
}

/** Escala sintética com todos os pesos = 1: a pontuação passa a ser o número de indicadores. */
const ESCALA_UNITARIA = escalaTeste(Object.fromEntries(TODOS_CODIGOS.map(c => [c, 1])))
const indicadoresQueSomam = (pontos: number) => TODOS_CODIGOS.slice(0, pontos).map(c => ativo(c))

describe('Motor de estratificação de risco', () => {
  describe('cenário base', () => {
    it('família sem vulnerabilidades: 0 pontos, R0', () => {
      const r = calcular(TODOS_CODIGOS.map(codigo => ({ codigo, ativo: false })))
      expect(r.pontuacaoTotal).toBe(0)
      expect(r.classificacao).toBe(FaixaRisco.SEM_RISCO_R0)
      expect(r.fatoresDeterminantes).toHaveLength(0)
      expect(r.regraDecisao).toContain(`abaixo de ${menorR1Minimo}`)
    })

    it('lista de indicadores vazia: 0 pontos, R0', () => {
      const r = calcular([])
      expect(r.pontuacaoTotal).toBe(0)
      expect(r.classificacao).toBe(FaixaRisco.SEM_RISCO_R0)
    })
  })

  describe('cada indicador isolado', () => {
    it.each(TODOS_CODIGOS)('%s soma exatamente o peso da escala', codigo => {
      const r = calcular([ativo(codigo)])
      expect(r.pontuacaoTotal).toBe(PESOS[codigo])
      expect(r.fatoresDeterminantes).toEqual([
        {
          indicadorCodigo: codigo,
          descricao: METADADOS_INDICADORES[codigo].descricao,
          pontuacaoAtribuida: PESOS[codigo],
          tipoSentinela: METADADOS_INDICADORES[codigo].tipo,
          individuoId: undefined
        }
      ])
    })

    it.each(TODOS_CODIGOS)('%s inativo não altera a pontuação', codigo => {
      expect(calcular([{ codigo, ativo: false }]).pontuacaoTotal).toBe(0)
    })

    it('associa o indivíduo apenas por ID (sem nome)', () => {
      const [fator] = calcular([ativo(IndicadorRiscoCodigo.IND_ACAMADO, 'ind-ficticio-7')]).fatoresDeterminantes
      expect(fator?.individuoId).toBe('ind-ficticio-7')
      expect(fator).not.toHaveProperty('individuoNome')
    })
  })

  describe('combinações', () => {
    it('todos os indicadores ativos somam o total da escala', () => {
      const r = calcular(TODOS_CODIGOS.map(c => ativo(c)))
      const somaEscala = TODOS_CODIGOS.reduce((s, c) => s + (PESOS[c] ?? 0), 0)
      expect(r.pontuacaoTotal).toBe(somaEscala)
      expect(r.classificacao).toBe(FaixaRisco.RISCO_MAIOR_R3)
    })

    it('explicabilidade: soma dos fatores == pontuação total', () => {
      const r = calcular([
        ativo(IndicadorRiscoCodigo.IND_DROGADICAO),
        ativo(IndicadorRiscoCodigo.IND_ANALFABETISMO),
        ativo(IndicadorRiscoCodigo.IND_HIPERTENSAO)
      ])
      const soma = r.fatoresDeterminantes.reduce((s, f) => s + f.pontuacaoAtribuida, 0)
      expect(soma).toBe(r.pontuacaoTotal)
    })
  })

  describe('limites entre faixas (boundary)', () => {
    it.each([
      [menorR1Minimo - 1, FaixaRisco.SEM_RISCO_R0],
      [menorR1Minimo, FaixaRisco.RISCO_MENOR_R1],
      [medioR2Minimo - 1, FaixaRisco.RISCO_MENOR_R1],
      [medioR2Minimo, FaixaRisco.RISCO_MEDIO_R2],
      [maiorR3Minimo - 1, FaixaRisco.RISCO_MEDIO_R2],
      [maiorR3Minimo, FaixaRisco.RISCO_MAIOR_R3]
    ])('%i pontos ⇒ %s', (pontos, faixa) => {
      const r = calcular(indicadoresQueSomam(pontos), ESCALA_UNITARIA)
      expect(r.pontuacaoTotal).toBe(pontos)
      expect(r.classificacao).toBe(faixa)
    })

    it('a regra de decisão cita a faixa de corte aplicada', () => {
      const r = calcular(indicadoresQueSomam(medioR2Minimo), ESCALA_UNITARIA)
      expect(r.regraDecisao).toContain(`${medioR2Minimo} a ${maiorR3Minimo - 1}`)
      expect(r.regraDecisao).toContain('R2')
    })
  })

  describe('gatilho direto (condição sentinela)', () => {
    const escalaComGatilho = escalaTeste({}, { condicoesAgravantesDiretas: [IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE] })

    it('eleva a R3 mesmo com pontuação baixa e explica o motivo', () => {
      const r = calcular([ativo(IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE)], escalaComGatilho)
      expect(r.pontuacaoTotal).toBeLessThan(maiorR3Minimo)
      expect(r.classificacao).toBe(FaixaRisco.RISCO_MAIOR_R3)
      expect(r.regraDecisao).toContain('gatilho direto')
      expect(r.regraDecisao).toContain(METADADOS_INDICADORES[IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE].descricao)
    })

    it('não dispara quando o indicador-gatilho está inativo', () => {
      const r = calcular([{ codigo: IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE, ativo: false }], escalaComGatilho)
      expect(r.classificacao).toBe(FaixaRisco.SEM_RISCO_R0)
    })
  })

  describe('dados ausentes ou incompletos', () => {
    it('lança erro para indicador desconhecido', () => {
      expect(() => calcular([{ codigo: 'IND_INEXISTENTE' as IndicadorRiscoCodigo, ativo: true }]))
        .toThrow('Indicador de risco desconhecido')
    })

    it('lança erro quando a escala não declara o indicador', () => {
      const { [IndicadorRiscoCodigo.IND_DIABETES]: _, ...semDiabetes } = PESOS
      const escalaIncompleta = { ...ESCALA, pesos: semDiabetes } as ConfiguracaoEscalaRisco
      expect(() => calcular([ativo(IndicadorRiscoCodigo.IND_DIABETES)], escalaIncompleta)).toThrow('ausente na escala')
    })

    it('indicador repetido conta uma única vez', () => {
      const r = calcular([ativo(IndicadorRiscoCodigo.IND_HIPERTENSAO, 'ind-a'), ativo(IndicadorRiscoCodigo.IND_HIPERTENSAO, 'ind-b')])
      expect(r.pontuacaoTotal).toBe(PESOS[IndicadorRiscoCodigo.IND_HIPERTENSAO])
      expect(r.fatoresDeterminantes).toHaveLength(1)
    })

    it('indicador com peso null é coletado, mas não pontuado', () => {
      const escala = escalaTeste({ [IndicadorRiscoCodigo.IND_ANALFABETISMO]: null })
      const r = calcular([ativo(IndicadorRiscoCodigo.IND_ANALFABETISMO, 'ind-c'), ativo(IndicadorRiscoCodigo.IND_DIABETES)], escala)
      expect(r.pontuacaoTotal).toBe(PESOS[IndicadorRiscoCodigo.IND_DIABETES])
      expect(r.fatoresDeterminantes.map(f => f.indicadorCodigo)).toEqual([IndicadorRiscoCodigo.IND_DIABETES])
      expect(r.indicadoresNaoPontuados).toEqual([
        {
          indicadorCodigo: IndicadorRiscoCodigo.IND_ANALFABETISMO,
          descricao: METADADOS_INDICADORES[IndicadorRiscoCodigo.IND_ANALFABETISMO].descricao,
          tipoSentinela: TipoSentinela.SOCIAL_ESCOLARIDADE,
          individuoId: 'ind-c'
        }
      ])
    })
  })

  describe('auditoria e determinismo', () => {
    it('registra versão da escala, data e avaliador do contexto', () => {
      const r = calcular([ativo(IndicadorRiscoCodigo.IND_ACAMADO)])
      expect(r.versaoEscala).toBe(ESCALA.versao)
      expect(r.dataAvaliacao).toBe(CONTEXTO.dataAvaliacao)
      expect(r.avaliadorId).toBe(CONTEXTO.avaliadorId)
      expect(r.avaliadorPerfil).toBe(PerfilProfissional.ACS)
    })

    it('mesma entrada + mesma escala + mesmo contexto ⇒ resultado idêntico', () => {
      const indicadores = [ativo(IndicadorRiscoCodigo.IND_ACAMADO), ativo(IndicadorRiscoCodigo.IND_DESEMPREGO)]
      expect(calcular(indicadores)).toEqual(calcular(indicadores))
    })

    it('aplica escala customizada e registra sua versão', () => {
      const escala = escalaTeste({ [IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO]: 2 })
      const r = calcular([ativo(IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO)], escala)
      expect(r.versaoEscala).toBe('ESCALA_TESTE')
      expect(r.pontuacaoTotal).toBe(2)
    })
  })

  describe('delta com a avaliação anterior', () => {
    const fator = (codigo: IndicadorRiscoCodigo): FatorDeterminanteRisco => ({
      indicadorCodigo: codigo,
      descricao: METADADOS_INDICADORES[codigo].descricao,
      pontuacaoAtribuida: PESOS[codigo] as number,
      tipoSentinela: METADADOS_INDICADORES[codigo].tipo
    })

    function comAnterior(indicadores: ItemIndicadorEntrada[], fatoresAnteriores: IndicadorRiscoCodigo[], configuracao = ESCALA) {
      const anterior = calcularEstratificacaoRisco(entradaCom(fatoresAnteriores.map(c => ativo(c))), CONTEXTO, configuracao)
      return calcularEstratificacaoRisco(
        entradaCom(indicadores, {
          avaliacaoAnterior: {
            id: 'aval-ant-01',
            data: '2026-01-10T10:00:00.000Z',
            pontuacao: anterior.pontuacaoTotal,
            classificacao: anterior.classificacao,
            fatores: fatoresAnteriores.map(fator)
          }
        }),
        CONTEXTO,
        configuracao
      ).comparativoAvaliacaoAnterior!
    }

    it('sem avaliação anterior não há delta', () => {
      expect(calcular([]).comparativoAvaliacaoAnterior).toBeUndefined()
    })

    it('AGRAVAMENTO quando surge um novo fator', () => {
      const d = comAnterior(
        [ativo(IndicadorRiscoCodigo.IND_HIPERTENSAO), ativo(IndicadorRiscoCodigo.IND_ACAMADO)],
        [IndicadorRiscoCodigo.IND_HIPERTENSAO]
      )
      expect(d.evolucaoRisco).toBe('AGRAVAMENTO')
      expect(d.variacaoPontos).toBe(PESOS[IndicadorRiscoCodigo.IND_ACAMADO])
      expect(d.fatoresAdicionados.map(f => f.indicadorCodigo)).toEqual([IndicadorRiscoCodigo.IND_ACAMADO])
      expect(d.fatoresResolvidos).toHaveLength(0)
      expect(d.avaliacaoAnteriorId).toBe('aval-ant-01')
    })

    it('MELHORIA quando um fator é resolvido', () => {
      const d = comAnterior(
        [ativo(IndicadorRiscoCodigo.IND_HIPERTENSAO)],
        [IndicadorRiscoCodigo.IND_HIPERTENSAO, IndicadorRiscoCodigo.IND_DESEMPREGO]
      )
      expect(d.evolucaoRisco).toBe('MELHORIA')
      expect(d.variacaoPontos).toBe(-(PESOS[IndicadorRiscoCodigo.IND_DESEMPREGO] as number))
      expect(d.fatoresResolvidos.map(f => f.indicadorCodigo)).toEqual([IndicadorRiscoCodigo.IND_DESEMPREGO])
    })

    it('ESTAVEL quando nada muda', () => {
      const d = comAnterior([ativo(IndicadorRiscoCodigo.IND_DIABETES)], [IndicadorRiscoCodigo.IND_DIABETES])
      expect(d.evolucaoRisco).toBe('ESTAVEL')
      expect(d.variacaoPontos).toBe(0)
    })

    it('ESTAVEL com troca de fatores de mesmo peso lista adicionados e resolvidos', () => {
      const d = comAnterior([ativo(IndicadorRiscoCodigo.IND_DIABETES)], [IndicadorRiscoCodigo.IND_HIPERTENSAO], ESCALA_UNITARIA)
      expect(d.evolucaoRisco).toBe('ESTAVEL')
      expect(d.fatoresAdicionados).toHaveLength(1)
      expect(d.fatoresResolvidos).toHaveLength(1)
    })
  })
})
