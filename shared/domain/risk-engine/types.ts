/**
 * Tipagens e contratos de domínio para o Motor de Estratificação de Risco Familiar
 * PET-Saúde: Atenção Primária à Saúde (APS / ESF)
 */

export enum FaixaRisco {
  SEM_RISCO_R0 = 'SEM_RISCO_R0',
  RISCO_MENOR_R1 = 'RISCO_MENOR_R1',
  RISCO_MEDIO_R2 = 'RISCO_MEDIO_R2',
  RISCO_MAIOR_R3 = 'RISCO_MAIOR_R3'
}

export enum TipoSentinela {
  BIOLOGICO_DEPENDENCIA = 'BIOLOGICO_DEPENDENCIA',
  BIOLOGICO_NUTRICIONAL = 'BIOLOGICO_NUTRICIONAL',
  BIOLOGICO_CICLO_VIDA = 'BIOLOGICO_CICLO_VIDA',
  BIOLOGICO_CRONICO = 'BIOLOGICO_CRONICO',
  SOCIAL_COMPORTAMENTAL = 'SOCIAL_COMPORTAMENTAL',
  SOCIAL_ECONOMICO = 'SOCIAL_ECONOMICO',
  SOCIAL_ESCOLARIDADE = 'SOCIAL_ESCOLARIDADE',
  SOCIAL_HABITACIONAL = 'SOCIAL_HABITACIONAL',
  AMBIENTAL_SANITARIO = 'AMBIENTAL_SANITARIO'
}

export enum IndicadorRiscoCodigo {
  IND_ACAMADO = 'IND_ACAMADO',
  IND_DEFICIENCIA_FISICA = 'IND_DEFICIENCIA_FISICA',
  IND_DEFICIENCIA_MENTAL = 'IND_DEFICIENCIA_MENTAL',
  IND_DESNUTRICAO_GRAVE = 'IND_DESNUTRICAO_GRAVE',
  IND_DROGADICAO = 'IND_DROGADICAO',
  IND_DESEMPREGO = 'IND_DESEMPREGO',
  IND_ANALFABETISMO = 'IND_ANALFABETISMO',
  IND_MENOR_6_MESES = 'IND_MENOR_6_MESES',
  IND_MAIOR_70_ANOS = 'IND_MAIOR_70_ANOS',
  IND_HIPERTENSAO = 'IND_HIPERTENSAO',
  IND_DIABETES = 'IND_DIABETES',
  IND_SANEAMENTO_INADEQUADO = 'IND_SANEAMENTO_INADEQUADO',
  IND_ADENSAMENTO_EXCESSIVO = 'IND_ADENSAMENTO_EXCESSIVO'
}

export interface FatorDeterminanteRisco {
  readonly indicadorCodigo: IndicadorRiscoCodigo
  readonly descricao: string
  readonly pontuacaoAtribuida: number
  readonly tipoSentinela: TipoSentinela
  readonly individuoId?: string
  readonly individuoNome?: string
}

export interface ComparativoAvaliacaoAnterior {
  readonly avaliacaoAnteriorId?: string
  readonly dataAvaliacaoAnterior?: string
  readonly classificacaoAnterior: FaixaRisco
  readonly pontuacaoAnterior: number
  readonly variacaoPontos: number
  readonly evolucaoRisco: 'AGRAVAMENTO' | 'ESTAVEL' | 'MELHORIA'
  readonly fatoresAdicionados: ReadonlyArray<FatorDeterminanteRisco>
  readonly fatoresResolvidos: ReadonlyArray<FatorDeterminanteRisco>
}

export interface ResultadoEstratificacaoRisco {
  readonly versaoEscala: string
  readonly dataAvaliacao: string
  readonly pontuacaoTotal: number
  readonly classificacao: FaixaRisco
  readonly fatoresDeterminantes: ReadonlyArray<FatorDeterminanteRisco>
  readonly regraDecisao: string
  readonly comparativoAvaliacaoAnterior?: ComparativoAvaliacaoAnterior
}

export interface LimitesFaixaRisco {
  readonly menorR1Minimo: number
  readonly medioR2Minimo: number
  readonly maiorR3Minimo: number
}

export interface MetaIndicador {
  readonly codigo: IndicadorRiscoCodigo
  readonly descricao: string
  readonly pesoPadrao: number
  readonly tipo: TipoSentinela
}

export interface ConfiguracaoEscalaRisco {
  readonly versao: string
  readonly nome: string
  readonly pesos: Record<IndicadorRiscoCodigo, number>
  readonly limitesCorte: LimitesFaixaRisco
  readonly condicoesAgravantesDiretas?: ReadonlyArray<IndicadorRiscoCodigo>
}

export interface ItemIndicadorEntrada {
  readonly codigo: IndicadorRiscoCodigo
  readonly ativo: boolean
  readonly individuoId?: string
  readonly individuoNome?: string
}

export interface DadosAvaliacaoEntrada {
  readonly familiaId: string
  readonly indicadores: ReadonlyArray<ItemIndicadorEntrada>
  readonly avaliacaoAnterior?: {
    readonly id?: string
    readonly data?: string
    readonly pontuacao: number
    readonly classificacao: FaixaRisco
    readonly fatores: ReadonlyArray<FatorDeterminanteRisco>
  }
}
