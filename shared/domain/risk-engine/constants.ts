import {
  FaixaRisco,
  IndicadorRiscoCodigo,
  TipoSentinela,
  type LimitesFaixaRisco,
  type MetaIndicador,
  type ConfiguracaoEscalaRisco
} from './types'

/**
 * Limites de corte canônicos da Escala de Risco Familiar de Coelho-Savassi (ERF-CS)
 * - 0 pontos: Sem Risco (R0)
 * - 1 a 4 pontos: Risco Menor (R1)
 * - 5 a 6 pontos: Risco Médio (R2)
 * - >= 7 pontos: Risco Máximo (R3)
 */
export const LIMITES_CORTE_COELHO_SAVASSI_PADRAO: LimitesFaixaRisco = {
  menorR1Minimo: 1,
  medioR2Minimo: 5,
  maiorR3Minimo: 7
} as const

/**
 * Metadados e pesos de referência de cada indicador sentinela
 */
export const METADADOS_INDICADORES: Record<IndicadorRiscoCodigo, MetaIndicador> = {
  [IndicadorRiscoCodigo.IND_ACAMADO]: {
    codigo: IndicadorRiscoCodigo.IND_ACAMADO,
    descricao: 'Pessoa acamada no domicílio',
    pesoPadrao: 3,
    tipo: TipoSentinela.BIOLOGICO_DEPENDENCIA
  },
  [IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA]: {
    codigo: IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA,
    descricao: 'Portador de deficiência física severa',
    pesoPadrao: 3,
    tipo: TipoSentinela.BIOLOGICO_DEPENDENCIA
  },
  [IndicadorRiscoCodigo.IND_DEFICIENCIA_MENTAL]: {
    codigo: IndicadorRiscoCodigo.IND_DEFICIENCIA_MENTAL,
    descricao: 'Portador de sofrimento mental severo / deficiência intelectual',
    pesoPadrao: 3,
    tipo: TipoSentinela.BIOLOGICO_DEPENDENCIA
  },
  [IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE]: {
    codigo: IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE,
    descricao: 'Desnutrição grave (criança, gestante ou idoso)',
    pesoPadrao: 3,
    tipo: TipoSentinela.BIOLOGICO_NUTRICIONAL
  },
  [IndicadorRiscoCodigo.IND_DROGADICAO]: {
    codigo: IndicadorRiscoCodigo.IND_DROGADICAO,
    descricao: 'Uso abusivo de álcool e/ou outras drogas',
    pesoPadrao: 2,
    tipo: TipoSentinela.SOCIAL_COMPORTAMENTAL
  },
  [IndicadorRiscoCodigo.IND_DESEMPREGO]: {
    codigo: IndicadorRiscoCodigo.IND_DESEMPREGO,
    descricao: 'Desemprego do provedor familiar',
    pesoPadrao: 2,
    tipo: TipoSentinela.SOCIAL_ECONOMICO
  },
  [IndicadorRiscoCodigo.IND_ANALFABETISMO]: {
    codigo: IndicadorRiscoCodigo.IND_ANALFABETISMO,
    descricao: 'Analfabetismo no núcleo familiar',
    pesoPadrao: 1,
    tipo: TipoSentinela.SOCIAL_ESCOLARIDADE
  },
  [IndicadorRiscoCodigo.IND_MENOR_6_MESES]: {
    codigo: IndicadorRiscoCodigo.IND_MENOR_6_MESES,
    descricao: 'Criança menor de 6 meses no domicílio',
    pesoPadrao: 1,
    tipo: TipoSentinela.BIOLOGICO_CICLO_VIDA
  },
  [IndicadorRiscoCodigo.IND_MAIOR_70_ANOS]: {
    codigo: IndicadorRiscoCodigo.IND_MAIOR_70_ANOS,
    descricao: 'Pessoa com 70 anos ou mais',
    pesoPadrao: 1,
    tipo: TipoSentinela.BIOLOGICO_CRONICO
  },
  [IndicadorRiscoCodigo.IND_HIPERTENSAO]: {
    codigo: IndicadorRiscoCodigo.IND_HIPERTENSAO,
    descricao: 'Hipertensão arterial sistêmica',
    pesoPadrao: 1,
    tipo: TipoSentinela.BIOLOGICO_CRONICO
  },
  [IndicadorRiscoCodigo.IND_DIABETES]: {
    codigo: IndicadorRiscoCodigo.IND_DIABETES,
    descricao: 'Diabetes mellitus',
    pesoPadrao: 1,
    tipo: TipoSentinela.BIOLOGICO_CRONICO
  },
  [IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO]: {
    codigo: IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO,
    descricao: 'Ausência de rede de esgoto / água encanada tratada',
    pesoPadrao: 1,
    tipo: TipoSentinela.AMBIENTAL_SANITARIO
  },
  [IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO]: {
    codigo: IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO,
    descricao: 'Adensamento excessivo (> 1 pessoa por cômodo)',
    pesoPadrao: 1,
    tipo: TipoSentinela.SOCIAL_HABITACIONAL
  }
} as const

/**
 * Tabela pura de pesos canônicos indexada por código
 */
export const PESOS_PADRAO: Record<IndicadorRiscoCodigo, number> = Object.values(METADADOS_INDICADORES).reduce(
  (acc, meta) => {
    acc[meta.codigo] = meta.pesoPadrao
    return acc
  },
  {} as Record<IndicadorRiscoCodigo, number>
)

/**
 * Configuração canônica padrão da Escala Coelho-Savassi Versão 1 (Coxim/Corumbá)
 */
export const CONFIGURACAO_COELHO_SAVASSI_V1: ConfiguracaoEscalaRisco = {
  versao: 'COELHO_SAVASSI_V1',
  nome: 'Escala de Risco Familiar de Coelho-Savassi (Referência)',
  pesos: PESOS_PADRAO,
  limitesCorte: LIMITES_CORTE_COELHO_SAVASSI_PADRAO,
  condicoesAgravantesDiretas: []
} as const

/**
 * Rótulos semânticos para apresentação visual das faixas de risco
 */
export const ROTULOS_FAIXA_RISCO: Record<FaixaRisco, { rotulo: string; sigla: string; acaoRecomendada: string }> = {
  [FaixaRisco.SEM_RISCO_R0]: {
    rotulo: 'Sem Risco Identificado',
    sigla: 'R0',
    acaoRecomendada: 'Acompanhamento padrão e ações de rotina na UBS'
  },
  [FaixaRisco.RISCO_MENOR_R1]: {
    rotulo: 'Risco Menor',
    sigla: 'R1',
    acaoRecomendada: 'Visita periódica programada e monitoramento de rotina'
  },
  [FaixaRisco.RISCO_MEDIO_R2]: {
    rotulo: 'Risco Médio',
    sigla: 'R2',
    acaoRecomendada: 'Acompanhamento prioritário e intervenção pela equipe da ESF'
  },
  [FaixaRisco.RISCO_MAIOR_R3]: {
    rotulo: 'Risco Máximo',
    sigla: 'R3',
    acaoRecomendada: 'Prioridade máxima, visita imediata e Plano de Cuidado Singular'
  }
} as const
