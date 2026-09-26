import {
  FaixaRisco,
  type ComparativoAvaliacaoAnterior,
  type ConfiguracaoEscalaRisco,
  type ContextoAvaliacao,
  type DadosAvaliacaoEntrada,
  type EvolucaoRisco,
  type FatorDeterminanteRisco,
  type IndicadorNaoPontuado,
  type IndicadorRiscoCodigo,
  type ResultadoEstratificacaoRisco
} from './types'
import {
  CONFIGURACAO_COELHO_SAVASSI_V1,
  METADADOS_INDICADORES,
  ORDEM_FAIXA_RISCO,
  ROTULOS_FAIXA_RISCO
} from './constants'

/**
 * Motor puro de domínio para estratificação de risco familiar.
 * Determinístico: data e avaliador vêm do `contexto`, nunca do relógio.
 * Sem dependências de UI ou banco de dados.
 */
export function calcularEstratificacaoRisco(
  entrada: DadosAvaliacaoEntrada,
  contexto: ContextoAvaliacao,
  configuracao: ConfiguracaoEscalaRisco = CONFIGURACAO_COELHO_SAVASSI_V1
): ResultadoEstratificacaoRisco {
  // 1. Indicadores ativos: pontuados (peso numérico) ou apenas coletados (peso null).
  //    Código repetido conta uma única vez (business_rules.md §4.6 — pendência P4).
  const fatoresDeterminantes: FatorDeterminanteRisco[] = []
  const indicadoresNaoPontuados: IndicadorNaoPontuado[] = []
  const codigosProcessados = new Set<IndicadorRiscoCodigo>()
  let pontuacaoTotal = 0

  for (const item of entrada.indicadores) {
    if (!item.ativo || codigosProcessados.has(item.codigo)) continue

    const meta = METADADOS_INDICADORES[item.codigo]
    if (!meta) {
      throw new Error(`Indicador de risco desconhecido: ${item.codigo}`)
    }
    if (!(item.codigo in configuracao.pesos)) {
      throw new Error(`Indicador ${item.codigo} ausente na escala ${configuracao.versao}`)
    }
    codigosProcessados.add(item.codigo)

    const peso = configuracao.pesos[item.codigo]
    if (peso === null) {
      indicadoresNaoPontuados.push({
        indicadorCodigo: item.codigo,
        descricao: meta.descricao,
        tipoSentinela: meta.tipo,
        individuoId: item.individuoId
      })
      continue
    }

    fatoresDeterminantes.push({
      indicadorCodigo: item.codigo,
      descricao: meta.descricao,
      pontuacaoAtribuida: peso,
      tipoSentinela: meta.tipo,
      individuoId: item.individuoId
    })
    pontuacaoTotal += peso
  }

  // 2. Faixa de risco pelos limites da versão da escala
  const { classificacao, regraDecisao } = classificarPontuacao(
    pontuacaoTotal,
    fatoresDeterminantes,
    configuracao
  )

  // 3. Delta explicativo em relação à avaliação anterior
  const comparativoAvaliacaoAnterior = entrada.avaliacaoAnterior
    ? compararComAnterior(entrada.avaliacaoAnterior, pontuacaoTotal, classificacao, fatoresDeterminantes)
    : undefined

  return {
    versaoEscala: configuracao.versao,
    dataAvaliacao: contexto.dataAvaliacao,
    avaliadorId: contexto.avaliadorId,
    avaliadorPerfil: contexto.avaliadorPerfil,
    pontuacaoTotal,
    classificacao,
    fatoresDeterminantes: Object.freeze(fatoresDeterminantes),
    indicadoresNaoPontuados: Object.freeze(indicadoresNaoPontuados),
    regraDecisao,
    comparativoAvaliacaoAnterior
  }
}

function classificarPontuacao(
  pontuacaoTotal: number,
  fatores: ReadonlyArray<FatorDeterminanteRisco>,
  configuracao: ConfiguracaoEscalaRisco
): { classificacao: FaixaRisco; regraDecisao: string } {
  const { menorR1Minimo, medioR2Minimo, maiorR3Minimo } = configuracao.limitesCorte

  const agravante = configuracao.condicoesAgravantesDiretas?.find(codigo =>
    fatores.some(f => f.indicadorCodigo === codigo)
  )
  if (agravante) {
    return {
      classificacao: FaixaRisco.RISCO_MAIOR_R3,
      regraDecisao: `Risco Máximo (R3) por condição sentinela de gatilho direto: ${METADADOS_INDICADORES[agravante].descricao}.`
    }
  }

  const rotulo = (faixa: FaixaRisco) =>
    `${ROTULOS_FAIXA_RISCO[faixa].rotulo} (${ROTULOS_FAIXA_RISCO[faixa].sigla})`

  if (pontuacaoTotal >= maiorR3Minimo) {
    return {
      classificacao: FaixaRisco.RISCO_MAIOR_R3,
      regraDecisao: `Pontuação de ${pontuacaoTotal} pontos (${maiorR3Minimo} ou mais) define ${rotulo(FaixaRisco.RISCO_MAIOR_R3)}.`
    }
  }
  if (pontuacaoTotal >= medioR2Minimo) {
    return {
      classificacao: FaixaRisco.RISCO_MEDIO_R2,
      regraDecisao: `Pontuação de ${pontuacaoTotal} pontos (${medioR2Minimo} a ${maiorR3Minimo - 1}) define ${rotulo(FaixaRisco.RISCO_MEDIO_R2)}.`
    }
  }
  if (pontuacaoTotal >= menorR1Minimo) {
    return {
      classificacao: FaixaRisco.RISCO_MENOR_R1,
      regraDecisao: `Pontuação de ${pontuacaoTotal} pontos (${menorR1Minimo} a ${medioR2Minimo - 1}) define ${rotulo(FaixaRisco.RISCO_MENOR_R1)}.`
    }
  }
  return {
    classificacao: FaixaRisco.SEM_RISCO_R0,
    regraDecisao: `Pontuação de ${pontuacaoTotal} pontos (abaixo de ${menorR1Minimo}) define ${rotulo(FaixaRisco.SEM_RISCO_R0)}.`
  }
}

function compararComAnterior(
  anterior: NonNullable<DadosAvaliacaoEntrada['avaliacaoAnterior']>,
  pontuacaoTotal: number,
  classificacao: FaixaRisco,
  fatoresAtuais: ReadonlyArray<FatorDeterminanteRisco>
): ComparativoAvaliacaoAnterior {
  const variacaoPontos = pontuacaoTotal - anterior.pontuacao
  const variacaoFaixa = ORDEM_FAIXA_RISCO[classificacao] - ORDEM_FAIXA_RISCO[anterior.classificacao]

  // A mudança de faixa prevalece; na mesma faixa, decide a variação de pontos.
  const sentido = variacaoFaixa !== 0 ? variacaoFaixa : variacaoPontos
  const evolucaoRisco: EvolucaoRisco = sentido > 0 ? 'AGRAVAMENTO' : sentido < 0 ? 'MELHORIA' : 'ESTAVEL'

  return {
    avaliacaoAnteriorId: anterior.id,
    dataAvaliacaoAnterior: anterior.data,
    classificacaoAnterior: anterior.classificacao,
    pontuacaoAnterior: anterior.pontuacao,
    variacaoPontos,
    evolucaoRisco,
    fatoresAdicionados: fatoresAtuais.filter(
      atual => !anterior.fatores.some(ant => ant.indicadorCodigo === atual.indicadorCodigo)
    ),
    fatoresResolvidos: anterior.fatores.filter(
      ant => !fatoresAtuais.some(atual => atual.indicadorCodigo === ant.indicadorCodigo)
    )
  }
}
