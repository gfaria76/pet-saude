import { FaixaRisco, ROTULOS_FAIXA_RISCO } from '~~/shared/domain/risk-engine'

/**
 * Único lugar que associa faixa de risco a cor, ícone e rótulo
 * (cor + ícone + texto; WCAG 2.1 AA). Ver context/ui_guidelines.md §2.
 * Texto branco só sobre tons -700 (contraste ≥ 4,5:1).
 */
export interface EstiloFaixa {
  rotulo: string
  sigla: string
  acaoRecomendada: string
  /** Ícone preenchido do Health Icons (estado de risco). */
  icone: string
  /** Fundo claro + texto escuro + borda (badges e cards). */
  suave: string
  /** Fundo sólido -700 com texto branco (pílulas, filtro ativo). */
  solido: string
  /** Borda lateral de destaque (cards do painel). */
  borda: string
  /** Cor de texto forte (números). */
  texto: string
}

const ESTILOS: Readonly<Record<FaixaRisco, Omit<EstiloFaixa, 'rotulo' | 'sigla' | 'acaoRecomendada'>>> = {
  [FaixaRisco.SEM_RISCO_R0]: {
    icone: 'healthicons:yes',
    suave: 'bg-green-50 text-green-900 border-green-200',
    solido: 'bg-green-700 text-white',
    borda: 'border-l-green-700',
    texto: 'text-green-800'
  },
  [FaixaRisco.RISCO_MENOR_R1]: {
    icone: 'healthicons:info',
    suave: 'bg-amber-50 text-amber-900 border-amber-200',
    solido: 'bg-amber-700 text-white',
    borda: 'border-l-amber-700',
    texto: 'text-amber-800'
  },
  [FaixaRisco.RISCO_MEDIO_R2]: {
    icone: 'healthicons:alert-triangle',
    suave: 'bg-orange-50 text-orange-950 border-orange-200',
    solido: 'bg-orange-700 text-white',
    borda: 'border-l-orange-700',
    texto: 'text-orange-800'
  },
  [FaixaRisco.RISCO_MAIOR_R3]: {
    icone: 'healthicons:alert',
    suave: 'bg-red-50 text-red-950 border-red-300',
    solido: 'bg-red-700 text-white',
    borda: 'border-l-red-700',
    texto: 'text-red-800'
  }
}

/** Faixas da mais grave para a menos grave (ordem de prioridade no painel). */
export const FAIXAS_POR_PRIORIDADE: ReadonlyArray<FaixaRisco> = [
  FaixaRisco.RISCO_MAIOR_R3,
  FaixaRisco.RISCO_MEDIO_R2,
  FaixaRisco.RISCO_MENOR_R1,
  FaixaRisco.SEM_RISCO_R0
]

export function estiloFaixa(faixa: FaixaRisco): EstiloFaixa {
  return { ...ROTULOS_FAIXA_RISCO[faixa], ...ESTILOS[faixa] }
}
