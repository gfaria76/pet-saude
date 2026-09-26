import {
  FaixaRisco,
  IndicadorRiscoCodigo,
  type FatorDeterminanteRisco,
  type ResultadoEstratificacaoRisco,
  type ComparativoAvaliacaoAnterior,
  type DadosAvaliacaoEntrada,
  type ConfiguracaoEscalaRisco
} from './types'
import {
  CONFIGURACAO_COELHO_SAVASSI_V1,
  METADADOS_INDICADORES,
  ROTULOS_FAIXA_RISCO
} from './constants'

/**
 * Motor puro de domínio para estratificação de risco familiar
 * Imutável, determinístico, testável e sem dependências de UI ou banco de dados.
 */
export function calcularEstratificacaoRisco(
  entrada: DadosAvaliacaoEntrada,
  configuracao: ConfiguracaoEscalaRisco = CONFIGURACAO_COELHO_SAVASSI_V1
): ResultadoEstratificacaoRisco {
  // 1. Processar os indicadores ativos e atribuir as pontuações da versão da escala
  const fatoresDeterminantes: FatorDeterminanteRisco[] = []
  let pontuacaoTotal = 0

  for (const item of entrada.indicadores) {
    if (!item.ativo) continue

    const meta = METADADOS_INDICADORES[item.codigo]
    if (!meta) {
      throw new Error(`Indicador de risco desconhecido: ${item.codigo}`)
    }

    // Busca o peso configurado ou o peso padrão do indicador
    const peso = configuracao.pesos[item.codigo] ?? meta.pesoPadrao

    fatoresDeterminantes.push({
      indicadorCodigo: item.codigo,
      descricao: meta.descricao,
      pontuacaoAtribuida: peso,
      tipoSentinela: meta.tipo,
      individuoId: item.individuoId,
      individuoNome: item.individuoNome
    })

    pontuacaoTotal += peso
  }

  // 2. Determinar a faixa de risco com base nos limites configuráveis
  const { menorR1Minimo, medioR2Minimo, maiorR3Minimo } = configuracao.limitesCorte
  let classificacao: FaixaRisco = FaixaRisco.SEM_RISCO_R0
  let regraDecisao = ''

  // Verificar se há condição sentinela que eleva diretamente a Risco Máximo
  const possuiAgravanteDireto = configuracao.condicoesAgravantesDiretas?.some(codigoAgravante =>
    fatoresDeterminantes.some(f => f.indicadorCodigo === codigoAgravante)
  )

  if (possuiAgravanteDireto) {
    classificacao = FaixaRisco.RISCO_MAIOR_R3
    regraDecisao = 'Classificado em Risco Máximo (R3) por presença de condição sentinela de gatilho direto.'
  } else if (pontuacaoTotal >= maiorR3Minimo) {
    classificacao = FaixaRisco.RISCO_MAIOR_R3
    regraDecisao = `Pontuação de ${pontuacaoTotal} pontos (>= ${maiorR3Minimo}) define Risco Máximo (R3).`
  } else if (pontuacaoTotal >= medioR2Minimo) {
    classificacao = FaixaRisco.RISCO_MEDIO_R2
    regraDecisao = `Pontuação de ${pontuacaoTotal} pontos (${medioR2Minimo} a ${maiorR3Minimo - 1}) define Risco Médio (R2).`
  } else if (pontuacaoTotal >= menorR1Minimo) {
    classificacao = FaixaRisco.RISCO_MENOR_R1
    regraDecisao = `Pontuação de ${pontuacaoTotal} pontos (${menorR1Minimo} a ${medioR2Minimo - 1}) define Risco Menor (R1).`
  } else {
    classificacao = FaixaRisco.SEM_RISCO_R0
    regraDecisao = 'Pontuação 0: nenhuma condição sentinela de risco identificada (R0).'
  }

  // 3. Comparativo com a avaliação anterior (Delta Explicativo)
  let comparativoAvaliacaoAnterior: ComparativoAvaliacaoAnterior | undefined

  if (entrada.avaliacaoAnterior) {
    const anterior = entrada.avaliacaoAnterior
    const variacaoPontos = pontuacaoTotal - anterior.pontuacao

    // Fatores que foram adicionados nesta avaliação
    const fatoresAdicionados = fatoresDeterminantes.filter(
      atual => !anterior.fatores.some(ant => ant.indicadorCodigo === atual.indicadorCodigo)
    )

    // Fatores que estavam presentes na anterior e foram resolvidos/removidos
    const fatoresResolvidos = anterior.fatores.filter(
      ant => !fatoresDeterminantes.some(atual => atual.indicadorCodigo === ant.indicadorCodigo)
    )

    // Determinação do sentido de evolução
    const pesoFaixa: Record<FaixaRisco, number> = {
      [FaixaRisco.SEM_RISCO_R0]: 0,
      [FaixaRisco.RISCO_MENOR_R1]: 1,
      [FaixaRisco.RISCO_MEDIO_R2]: 2,
      [FaixaRisco.RISCO_MAIOR_R3]: 3
    }

    let evolucaoRisco: 'AGRAVAMENTO' | 'ESTAVEL' | 'MELHORIA' = 'ESTAVEL'
    if (pesoFaixa[classificacao] > pesoFaixa[anterior.classificacao] || (pesoFaixa[classificacao] === pesoFaixa[anterior.classificacao] && variacaoPontos > 0)) {
      evolucaoRisco = 'AGRAVAMENTO'
    } else if (pesoFaixa[classificacao] < pesoFaixa[anterior.classificacao] || (pesoFaixa[classificacao] === pesoFaixa[anterior.classificacao] && variacaoPontos < 0)) {
      evolucaoRisco = 'MELHORIA'
    }

    comparativoAvaliacaoAnterior = {
      avaliacaoAnteriorId: anterior.id,
      dataAvaliacaoAnterior: anterior.data,
      classificacaoAnterior: anterior.classificacao,
      pontuacaoAnterior: anterior.pontuacao,
      variacaoPontos,
      evolucaoRisco,
      fatoresAdicionados,
      fatoresResolvidos
    }
  }

  return {
    versaoEscala: configuracao.versao,
    dataAvaliacao: new Date().toISOString(),
    pontuacaoTotal,
    classificacao,
    fatoresDeterminantes: Object.freeze(fatoresDeterminantes),
    regraDecisao,
    comparativoAvaliacaoAnterior
  }
}
