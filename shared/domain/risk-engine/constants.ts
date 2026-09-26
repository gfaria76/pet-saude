import {
  FaixaRisco,
  IndicadorRiscoCodigo,
  TipoSentinela,
  type ConfiguracaoEscalaRisco,
  type LimitesFaixaRisco,
  type MetaIndicador
} from './types'

/**
 * Metadados descritivos de cada indicador coletado (Relatório Técnico, seção 2).
 * Pesos NÃO ficam aqui: pertencem à versão da escala (ConfiguracaoEscalaRisco).
 */
export const METADADOS_INDICADORES: Readonly<Record<IndicadorRiscoCodigo, MetaIndicador>> = {
  [IndicadorRiscoCodigo.IND_ACAMADO]: {
    codigo: IndicadorRiscoCodigo.IND_ACAMADO,
    descricao: 'Pessoa acamada no domicílio',
    tipo: TipoSentinela.BIOLOGICO_DEPENDENCIA
  },
  [IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA]: {
    codigo: IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA,
    descricao: 'Deficiência física',
    tipo: TipoSentinela.BIOLOGICO_DEPENDENCIA
  },
  [IndicadorRiscoCodigo.IND_DEFICIENCIA_MENTAL]: {
    codigo: IndicadorRiscoCodigo.IND_DEFICIENCIA_MENTAL,
    descricao: 'Deficiência mental',
    tipo: TipoSentinela.BIOLOGICO_DEPENDENCIA
  },
  [IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE]: {
    codigo: IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE,
    descricao: 'Desnutrição grave',
    tipo: TipoSentinela.BIOLOGICO_NUTRICIONAL
  },
  [IndicadorRiscoCodigo.IND_DROGADICAO]: {
    codigo: IndicadorRiscoCodigo.IND_DROGADICAO,
    descricao: 'Dependência química (álcool e/ou outras drogas)',
    tipo: TipoSentinela.SOCIAL_COMPORTAMENTAL
  },
  [IndicadorRiscoCodigo.IND_DESEMPREGO]: {
    codigo: IndicadorRiscoCodigo.IND_DESEMPREGO,
    descricao: 'Desemprego',
    tipo: TipoSentinela.SOCIAL_ECONOMICO
  },
  [IndicadorRiscoCodigo.IND_ANALFABETISMO]: {
    codigo: IndicadorRiscoCodigo.IND_ANALFABETISMO,
    descricao: 'Analfabetismo',
    tipo: TipoSentinela.SOCIAL_ESCOLARIDADE
  },
  [IndicadorRiscoCodigo.IND_MENOR_6_MESES]: {
    codigo: IndicadorRiscoCodigo.IND_MENOR_6_MESES,
    descricao: 'Criança menor de 6 meses',
    tipo: TipoSentinela.BIOLOGICO_CICLO_VIDA
  },
  [IndicadorRiscoCodigo.IND_MAIOR_70_ANOS]: {
    codigo: IndicadorRiscoCodigo.IND_MAIOR_70_ANOS,
    descricao: 'Pessoa maior de 70 anos',
    tipo: TipoSentinela.BIOLOGICO_CICLO_VIDA
  },
  [IndicadorRiscoCodigo.IND_HIPERTENSAO]: {
    codigo: IndicadorRiscoCodigo.IND_HIPERTENSAO,
    descricao: 'Hipertensão arterial sistêmica',
    tipo: TipoSentinela.BIOLOGICO_CRONICO
  },
  [IndicadorRiscoCodigo.IND_DIABETES]: {
    codigo: IndicadorRiscoCodigo.IND_DIABETES,
    descricao: 'Diabetes mellitus',
    tipo: TipoSentinela.BIOLOGICO_CRONICO
  },
  [IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO]: {
    codigo: IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO,
    descricao: 'Condições de saneamento baixas',
    tipo: TipoSentinela.AMBIENTAL_SANITARIO
  },
  [IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO]: {
    codigo: IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO,
    descricao: 'Relação morador por cômodo maior que 1',
    tipo: TipoSentinela.SOCIAL_HABITACIONAL
  }
}

/**
 * PENDENTE DE VALIDAÇÃO (business_rules.md §5, P2): faixas de corte sem fonte no
 * Relatório Técnico. Confirmar com a publicação original e a coordenação de APS.
 */
export const LIMITES_CORTE_COELHO_SAVASSI_V1: LimitesFaixaRisco = {
  menorR1Minimo: 1,
  medioR2Minimo: 5,
  maiorR3Minimo: 7
}

/**
 * PENDENTE DE VALIDAÇÃO (business_rules.md §5, P1 e P3): pesos sem fonte no
 * Relatório Técnico. Alterar qualquer valor exige NOVA versão da escala.
 */
export const PESOS_COELHO_SAVASSI_V1: Readonly<Record<IndicadorRiscoCodigo, number | null>> = {
  [IndicadorRiscoCodigo.IND_ACAMADO]: 3,
  [IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA]: 3,
  [IndicadorRiscoCodigo.IND_DEFICIENCIA_MENTAL]: 3,
  [IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE]: 3,
  [IndicadorRiscoCodigo.IND_DROGADICAO]: 2,
  [IndicadorRiscoCodigo.IND_DESEMPREGO]: 2,
  [IndicadorRiscoCodigo.IND_ANALFABETISMO]: 1,
  [IndicadorRiscoCodigo.IND_MENOR_6_MESES]: 1,
  [IndicadorRiscoCodigo.IND_MAIOR_70_ANOS]: 1,
  [IndicadorRiscoCodigo.IND_HIPERTENSAO]: 1,
  [IndicadorRiscoCodigo.IND_DIABETES]: 1,
  [IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO]: 1,
  [IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO]: 1
}

/** Versão vigente da escala (pesos e cortes pendentes de validação). */
export const CONFIGURACAO_COELHO_SAVASSI_V1: ConfiguracaoEscalaRisco = {
  versao: 'COELHO_SAVASSI_V1',
  nome: 'Escala de Risco Familiar inspirada em Coelho-Savassi (parâmetros pendentes de validação)',
  pesos: PESOS_COELHO_SAVASSI_V1,
  limitesCorte: LIMITES_CORTE_COELHO_SAVASSI_V1,
  condicoesAgravantesDiretas: []
}

/** Ordem de gravidade das faixas, usada no delta explicativo. */
export const ORDEM_FAIXA_RISCO: Readonly<Record<FaixaRisco, number>> = {
  [FaixaRisco.SEM_RISCO_R0]: 0,
  [FaixaRisco.RISCO_MENOR_R1]: 1,
  [FaixaRisco.RISCO_MEDIO_R2]: 2,
  [FaixaRisco.RISCO_MAIOR_R3]: 3
}

/** Rótulos semânticos das faixas (texto obrigatório junto de cor e ícone). */
export const ROTULOS_FAIXA_RISCO: Readonly<Record<FaixaRisco, { rotulo: string; sigla: string; acaoRecomendada: string }>> = {
  [FaixaRisco.SEM_RISCO_R0]: {
    rotulo: 'Sem Risco Identificado',
    sigla: 'R0',
    acaoRecomendada: 'Acompanhamento de rotina da UBS'
  },
  [FaixaRisco.RISCO_MENOR_R1]: {
    rotulo: 'Risco Menor',
    sigla: 'R1',
    acaoRecomendada: 'Visita periódica programada e monitoramento'
  },
  [FaixaRisco.RISCO_MEDIO_R2]: {
    rotulo: 'Risco Médio',
    sigla: 'R2',
    acaoRecomendada: 'Acompanhamento prioritário pela equipe da ESF'
  },
  [FaixaRisco.RISCO_MAIOR_R3]: {
    rotulo: 'Risco Máximo',
    sigla: 'R3',
    acaoRecomendada: 'Prioridade máxima e plano de cuidado singular'
  }
}
