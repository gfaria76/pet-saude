import {
  FaixaRisco,
  IndicadorRiscoCodigo,
  LIMITES_CORTE_COELHO_SAVASSI_V1
} from '~~/shared/domain/risk-engine'
import type { AvaliacaoRiscoDoc, FamiliaDoc } from '~~/shared/domain/schemas'

/**
 * Agregação territorial (por microárea) do mapa de calor do dashboard.
 * Nunca geolocaliza uma família individual: minimização LGPD
 * (context/security_privacy.md). Função pura, testável sem Vue/Leaflet.
 */

export interface FamiliaComUltimaAvaliacao {
  readonly familia: FamiliaDoc
  readonly ultimaAvaliacao: AvaliacaoRiscoDoc | null
}

export interface IntensidadeIndicador {
  readonly quantidade: number
  /** Percentual arredondado (0–100) de famílias da microárea com o indicador ativo. */
  readonly percentual: number
}

export interface AgregacaoMicroarea {
  readonly microareaId: string
  readonly municipioId: string
  readonly totalFamilias: number
  /** Média simples da pontuação da última avaliação de cada família (famílias sem avaliação contam 0). */
  readonly pontuacaoMediaRisco: number
  readonly porIndicador: Readonly<Record<IndicadorRiscoCodigo, IntensidadeIndicador>>
}

/** Agrupa famílias por microárea e calcula a prevalência de cada indicador. */
export function agregarRiscoPorMicroarea(
  entradas: ReadonlyArray<FamiliaComUltimaAvaliacao>
): AgregacaoMicroarea[] {
  const porMicroarea = new Map<string, FamiliaComUltimaAvaliacao[]>()
  for (const entrada of entradas) {
    const chave = entrada.familia.microareaId
    const grupo = porMicroarea.get(chave)
    if (grupo) grupo.push(entrada)
    else porMicroarea.set(chave, [entrada])
  }

  return Array.from(porMicroarea.entries()).map(([microareaId, grupo]) => {
    const totalFamilias = grupo.length
    const contagem = new Map<IndicadorRiscoCodigo, number>(
      Object.values(IndicadorRiscoCodigo).map(codigo => [codigo, 0])
    )

    let somaPontuacao = 0
    for (const { ultimaAvaliacao } of grupo) {
      if (!ultimaAvaliacao) continue
      somaPontuacao += ultimaAvaliacao.pontuacaoTotal
      const codigosPresentes = new Set(ultimaAvaliacao.fatoresDeterminantes.map(f => f.indicadorCodigo))
      for (const codigo of codigosPresentes) {
        contagem.set(codigo, (contagem.get(codigo) ?? 0) + 1)
      }
    }

    const porIndicador = Object.fromEntries(
      Array.from(contagem.entries()).map(([codigo, quantidade]) => [
        codigo,
        { quantidade, percentual: totalFamilias > 0 ? Math.round((quantidade / totalFamilias) * 100) : 0 }
      ])
    ) as Record<IndicadorRiscoCodigo, IntensidadeIndicador>

    return {
      microareaId,
      municipioId: grupo[0]!.familia.municipioId,
      totalFamilias,
      pontuacaoMediaRisco: totalFamilias > 0 ? somaPontuacao / totalFamilias : 0,
      porIndicador
    }
  })
}

/**
 * Escala sequencial de intensidade (0–100%) para o modo "por indicador".
 * Deliberadamente distinta das cores de faixa de risco (verde→vermelho) em
 * `estiloFaixaRisco.ts`: prevalência de um indicador não é uma classificação
 * de risco familiar, então usa a paleta operacional (cyan) para não confundir
 * as duas semânticas.
 */
const DEGRAUS_INTENSIDADE: ReadonlyArray<{ max: number; cor: string }> = [
  { max: 0, cor: '#E0F2FE' }, // cyan-100: nenhuma família
  { max: 25, cor: '#7DD3FC' }, // cyan-300
  { max: 50, cor: '#38BDF8' }, // cyan-400
  { max: 75, cor: '#0284C7' }, // cyan-600
  { max: 100, cor: '#0E7490' } // cyan-700 (contraste ≥ 4,5:1 com texto branco)
]

export function corIntensidadeIndicador(percentual: number): string {
  const degrau = DEGRAUS_INTENSIDADE.find(d => percentual <= d.max)
  return (degrau ?? DEGRAUS_INTENSIDADE[DEGRAUS_INTENSIDADE.length - 1]!).cor
}

/**
 * Classifica a pontuação média de uma microárea nas mesmas faixas do motor
 * de risco (`LIMITES_CORTE_COELHO_SAVASSI_V1`), para o modo "risco geral"
 * reaproveitar as cores de `estiloFaixaRisco.ts`. É uma leitura agregada e
 * indicativa do território — não substitui a classificação de cada família.
 */
export function faixaMediaTerritorio(pontuacaoMediaRisco: number): FaixaRisco {
  const { menorR1Minimo, medioR2Minimo, maiorR3Minimo } = LIMITES_CORTE_COELHO_SAVASSI_V1
  if (pontuacaoMediaRisco >= maiorR3Minimo) return FaixaRisco.RISCO_MAIOR_R3
  if (pontuacaoMediaRisco >= medioR2Minimo) return FaixaRisco.RISCO_MEDIO_R2
  if (pontuacaoMediaRisco >= menorR1Minimo) return FaixaRisco.RISCO_MENOR_R1
  return FaixaRisco.SEM_RISCO_R0
}
