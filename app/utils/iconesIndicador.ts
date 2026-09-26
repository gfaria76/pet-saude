import { IndicadorRiscoCodigo } from '~~/shared/domain/risk-engine'

/**
 * Ícone (Health Icons) de cada indicador do Relatório Técnico.
 * Ver context/ui_guidelines.md §4.2. Novo indicador ⇒ novo ícone aqui.
 */
export const ICONES_INDICADOR: Readonly<Record<IndicadorRiscoCodigo, string>> = {
  [IndicadorRiscoCodigo.IND_ACAMADO]: 'healthicons:hospitalized',
  [IndicadorRiscoCodigo.IND_DEFICIENCIA_FISICA]: 'healthicons:wheelchair',
  [IndicadorRiscoCodigo.IND_DEFICIENCIA_MENTAL]: 'healthicons:mental-health',
  [IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE]: 'healthicons:malnutrition',
  [IndicadorRiscoCodigo.IND_DROGADICAO]: 'healthicons:alcohol',
  [IndicadorRiscoCodigo.IND_DESEMPREGO]: 'healthicons:low-income-level',
  [IndicadorRiscoCodigo.IND_ANALFABETISMO]: 'healthicons:book',
  [IndicadorRiscoCodigo.IND_MENOR_6_MESES]: 'healthicons:baby-0306m',
  [IndicadorRiscoCodigo.IND_MAIOR_70_ANOS]: 'healthicons:elderly',
  [IndicadorRiscoCodigo.IND_HIPERTENSAO]: 'healthicons:blood-pressure',
  [IndicadorRiscoCodigo.IND_DIABETES]: 'healthicons:diabetes',
  [IndicadorRiscoCodigo.IND_SANEAMENTO_INADEQUADO]: 'healthicons:water-sanitation',
  [IndicadorRiscoCodigo.IND_ADENSAMENTO_EXCESSIVO]: 'healthicons:i-groups-perspective-crowd'
}
