/**
 * Mapa central de ícones gerais do app (padrão: Health Icons).
 * Lucide só aparece aqui, como exceção para controles genéricos que a
 * coleção Health Icons não oferece. Ver context/ui_guidelines.md §4.
 */
export const ICONES = {
  // Health Icons — semântica de saúde, pessoas e território
  app: 'healthicons:community-healthworker',
  familia: 'healthicons:ui-folder-family-outline',
  pessoa: 'healthicons:person-outline',
  avaliador: 'healthicons:community-healthworker-outline',
  ubs: 'healthicons:ambulatory-clinic-outline',
  municipio: 'healthicons:city-outline',
  lgpd: 'healthicons:health-data-security-outline',
  calendario: 'healthicons:calendar-outline',
  registroConfirmado: 'healthicons:i-documents-accepted-outline',
  vazio: 'healthicons:question-circle-outline',
  escala: 'healthicons:chart-line-outline',

  // Exceções Lucide — controles genéricos de interface
  salvar: 'lucide:save',
  filtro: 'lucide:filter',
  fechar: 'lucide:x',
  buscar: 'lucide:search',
  marcado: 'lucide:check',
  regraDecisao: 'lucide:scale',
  agravamento: 'lucide:trending-up',
  melhoria: 'lucide:trending-down',
  estavel: 'lucide:minus'
} as const
