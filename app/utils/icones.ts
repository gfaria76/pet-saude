/**
 * Mapa central de ícones do sistema PET-Saúde.
 * Segue o padrão de coleções Iconify aprovadas (context/ui_guidelines.md §4):
 * - Health Icons (`healthicons:*`): saúde comunitária, ACS, pessoas e determinantes.
 * - Medical Icon (`medical-icon:*`): atenção primária, prontuários e serviços clínicos.
 * - Academicons (`academicons:*`): parceria acadêmica UFMS, pesquisa e protocolos.
 * - Weather Icons (`wi:*`): climatologia pantaneira, calor extremo e modo sol forte.
 * - Lucide (`lucide:*`): exclusivamente controles utilitários de interface.
 */
export const ICONES = {
  // Medical Icon — Atenção Primária, prontuários e organização de serviços
  atencaoPrimaria: 'medical-icon:i-family-practice',
  prontuario: 'medical-icon:i-medical-records',
  equipeSaude: 'medical-icon:i-care-staff-area',
  servicoSocial: 'medical-icon:i-social-services',
  servicoSaude: 'medical-icon:i-health-services',

  // Health Icons — Saúde pública comunitária, indivíduos e território
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
  domicilio: 'healthicons:home-outline',
  membros: 'healthicons:i-groups-perspective-crowd',
  telefone: 'healthicons:phone-outline',
  saneamento: 'healthicons:water-sanitation',

  // Weather Icons (WI) — Climatologia de campo e Modo Sol Forte (Coxim / Corumbá)
  solForte: 'wi:day-sunny',
  clima: 'wi:hot',
  calorExtremo: 'wi:hot',
  temperatura: 'wi:thermometer',
  alagamento: 'wi:flood',
  umidade: 'wi:humidity',

  // Academicons — Parceria acadêmica UFMS, pesquisa científica e ciência aberta
  universidade: 'academicons:open-access',
  pesquisa: 'academicons:protocols',
  dadosAbertos: 'academicons:open-data',

  // Exceções Lucide — Apenas controles utilitários de interface
  menu: 'lucide:panel-left',
  tema: 'lucide:monitor',
  salvar: 'lucide:save',
  sincronizar: 'lucide:refresh-cw',
  filtro: 'lucide:filter',
  mapa: 'lucide:map',
  fechar: 'lucide:x',
  buscar: 'lucide:search',
  marcado: 'lucide:check',
  regraDecisao: 'lucide:scale',
  agravamento: 'lucide:trending-up',
  melhoria: 'lucide:trending-down',
  estavel: 'lucide:minus',
  setaVoltar: 'lucide:arrow-left',
  chevronRight: 'lucide:chevron-right',
  plus: 'lucide:plus'
} as const
