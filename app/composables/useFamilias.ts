import { ref, computed } from 'vue'
import {
  FaixaRisco,
  IndicadorRiscoCodigo,
  TipoSentinela,
  type ResultadoEstratificacaoRisco
} from '~~/shared/domain/risk-engine'
import type { FamiliaDoc, AvaliacaoRiscoDoc } from '~~/shared/domain/schemas'

/**
 * Famílias e avaliações com dados 100% fictícios para demonstração e desenvolvimento seguro (LGPD).
 * Territórios piloto: UBSs de Coxim e Corumbá (MS).
 */
const FAMILIAS_INICIAIS_SINTETICAS: FamiliaDoc[] = [
  {
    id: 'fam-coxim-001',
    prontuarioFamiliar: 'CX-1042',
    domicilioId: 'dom-001',
    microareaId: 'MA-01',
    equipeId: 'ESF-PANTANAL-01',
    municipioId: 'coxim',
    responsavelNome: 'Maria Severina da Silva (Fictícia)',
    responsavelId: 'ind-001',
    status: 'ATIVA',
    quantidadeMembros: 4,
    ultimaClassificacaoRisco: FaixaRisco.RISCO_MAIOR_R3,
    ultimaPontuacaoRisco: 8,
    dataUltimaAvaliacao: '2026-09-18T14:30:00Z'
  },
  {
    id: 'fam-coxim-002',
    prontuarioFamiliar: 'CX-1088',
    domicilioId: 'dom-002',
    microareaId: 'MA-01',
    equipeId: 'ESF-PANTANAL-01',
    municipioId: 'coxim',
    responsavelNome: 'Antônio Carlos dos Santos (Fictício)',
    responsavelId: 'ind-002',
    status: 'ATIVA',
    quantidadeMembros: 3,
    ultimaClassificacaoRisco: FaixaRisco.RISCO_MEDIO_R2,
    ultimaPontuacaoRisco: 5,
    dataUltimaAvaliacao: '2026-09-15T09:15:00Z'
  },
  {
    id: 'fam-corumba-003',
    prontuarioFamiliar: 'CB-2031',
    domicilioId: 'dom-003',
    microareaId: 'MA-02',
    equipeId: 'ESF-FRONTEIRA-02',
    municipioId: 'corumba',
    responsavelNome: 'Tereza Francisca de Souza (Fictícia)',
    responsavelId: 'ind-003',
    status: 'ATIVA',
    quantidadeMembros: 5,
    ultimaClassificacaoRisco: FaixaRisco.RISCO_MENOR_R1,
    ultimaPontuacaoRisco: 3,
    dataUltimaAvaliacao: '2026-09-10T11:00:00Z'
  },
  {
    id: 'fam-corumba-004',
    prontuarioFamiliar: 'CB-2095',
    domicilioId: 'dom-004',
    microareaId: 'MA-03',
    equipeId: 'ESF-FRONTEIRA-02',
    municipioId: 'corumba',
    responsavelNome: 'João Ribeiro de Lima (Fictício)',
    responsavelId: 'ind-004',
    status: 'ATIVA',
    quantidadeMembros: 2,
    ultimaClassificacaoRisco: FaixaRisco.SEM_RISCO_R0,
    ultimaPontuacaoRisco: 0,
    dataUltimaAvaliacao: '2026-08-20T16:00:00Z'
  }
]

const AVALIACOES_INICIAIS: Record<string, ResultadoEstratificacaoRisco> = {
  'fam-coxim-001': {
    versaoEscala: 'COELHO_SAVASSI_V1',
    dataAvaliacao: '2026-09-18T14:30:00Z',
    pontuacaoTotal: 8,
    classificacao: FaixaRisco.RISCO_MAIOR_R3,
    regraDecisao: 'Pontuação de 8 pontos (>= 7) define Risco Máximo (R3).',
    fatoresDeterminantes: [
      {
        indicadorCodigo: IndicadorRiscoCodigo.IND_ACAMADO,
        descricao: 'Pessoa acamada no domicílio',
        pontuacaoAtribuida: 3,
        tipoSentinela: TipoSentinela.BIOLOGICO_DEPENDENCIA,
        individuoNome: 'Benedito da Silva (Idoso Acamado)'
      },
      {
        indicadorCodigo: IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE,
        descricao: 'Desnutrição grave (criança, gestante ou idoso)',
        pontuacaoAtribuida: 3,
        tipoSentinela: TipoSentinela.BIOLOGICO_NUTRICIONAL
      },
      {
        indicadorCodigo: IndicadorRiscoCodigo.IND_DROGADICAO,
        descricao: 'Uso abusivo de álcool e/ou outras drogas',
        pontuacaoAtribuida: 2,
        tipoSentinela: TipoSentinela.SOCIAL_COMPORTAMENTAL
      }
    ],
    comparativoAvaliacaoAnterior: {
      classificacaoAnterior: FaixaRisco.RISCO_MEDIO_R2,
      pontuacaoAnterior: 5,
      variacaoPontos: +3,
      evolucaoRisco: 'AGRAVAMENTO',
      fatoresAdicionados: [
        {
          indicadorCodigo: IndicadorRiscoCodigo.IND_ACAMADO,
          descricao: 'Pessoa acamada no domicílio',
          pontuacaoAtribuida: 3,
          tipoSentinela: TipoSentinela.BIOLOGICO_DEPENDENCIA
        }
      ],
      fatoresResolvidos: []
    }
  },
  'fam-coxim-002': {
    versaoEscala: 'COELHO_SAVASSI_V1',
    dataAvaliacao: '2026-09-15T09:15:00Z',
    pontuacaoTotal: 5,
    classificacao: FaixaRisco.RISCO_MEDIO_R2,
    regraDecisao: 'Pontuação de 5 pontos (5 a 6) define Risco Médio (R2).',
    fatoresDeterminantes: [
      {
        indicadorCodigo: IndicadorRiscoCodigo.IND_DESEMPREGO,
        descricao: 'Desemprego do provedor familiar',
        pontuacaoAtribuida: 2,
        tipoSentinela: TipoSentinela.SOCIAL_ECONOMICO
      },
      {
        indicadorCodigo: IndicadorRiscoCodigo.IND_DROGADICAO,
        descricao: 'Uso abusivo de álcool e/ou outras drogas',
        pontuacaoAtribuida: 2,
        tipoSentinela: TipoSentinela.SOCIAL_COMPORTAMENTAL
      },
      {
        indicadorCodigo: IndicadorRiscoCodigo.IND_HIPERTENSAO,
        descricao: 'Hipertensão arterial sistêmica',
        pontuacaoAtribuida: 1,
        tipoSentinela: TipoSentinela.BIOLOGICO_CRONICO
      }
    ]
  }
}

export function useFamilias() {
  const familias = ref<FamiliaDoc[]>([...FAMILIAS_INICIAIS_SINTETICAS])
  const avaliacoesMap = ref<Record<string, ResultadoEstratificacaoRisco>>({ ...AVALIACOES_INICIAIS })

  const filtroMunicipio = ref<string>('todos')
  const filtroFaixaRisco = ref<FaixaRisco | 'TODAS'>('TODAS')
  const termoBusca = ref<string>('')

  // Família e avaliação selecionadas para exibição no Drawer Explicativo
  const familiaSelecionada = ref<FamiliaDoc | null>(null)
  const avaliacaoSelecionada = ref<ResultadoEstratificacaoRisco | null>(null)
  const drawerAberto = ref<boolean>(false)

  // Família selecionada para preenchimento de nova avaliação
  const familiaEmAvaliacao = ref<FamiliaDoc | null>(null)
  const modalAvaliacaoAberto = ref<boolean>(false)

  // Contagem quantitativa por faixa de risco para o painel de métricas
  const contagemRisco = computed(() => {
    const contagem: Record<FaixaRisco, number> = {
      [FaixaRisco.SEM_RISCO_R0]: 0,
      [FaixaRisco.RISCO_MENOR_R1]: 0,
      [FaixaRisco.RISCO_MEDIO_R2]: 0,
      [FaixaRisco.RISCO_MAIOR_R3]: 0
    }

    for (const fam of familias.value) {
      contagem[fam.ultimaClassificacaoRisco] = (contagem[fam.ultimaClassificacaoRisco] || 0) + 1
    }

    return contagem
  })

  // Lista filtrada
  const familiasFiltradas = computed(() => {
    return familias.value.filter(fam => {
      if (filtroMunicipio.value !== 'todos' && fam.municipioId !== filtroMunicipio.value) {
        return false
      }
      if (filtroFaixaRisco.value !== 'TODAS' && fam.ultimaClassificacaoRisco !== filtroFaixaRisco.value) {
        return false
      }
      if (termoBusca.value.trim() !== '') {
        const busca = termoBusca.value.toLowerCase()
        const bateNome = fam.responsavelNome.toLowerCase().includes(busca)
        const bateProntuario = fam.prontuarioFamiliar.toLowerCase().includes(busca)
        if (!bateNome && !bateProntuario) return false
      }
      return true
    })
  })

  function abrirDrawerExplicativo(familia: FamiliaDoc) {
    familiaSelecionada.value = familia
    avaliacaoSelecionada.value = avaliacoesMap.value[familia.id] || null
    drawerAberto.value = true
  }

  function fecharDrawer() {
    drawerAberto.value = false
    familiaSelecionada.value = null
    avaliacaoSelecionada.value = null
  }

  function iniciarNovaAvaliacao(familia: FamiliaDoc) {
    familiaEmAvaliacao.value = familia
    modalAvaliacaoAberto.value = true
    if (drawerAberto.value) {
      fecharDrawer()
    }
  }

  function fecharModalAvaliacao() {
    modalAvaliacaoAberto.value = false
    familiaEmAvaliacao.value = null
  }

  function salvarNovaAvaliacao(resultado: ResultadoEstratificacaoRisco) {
    if (!familiaEmAvaliacao.value) return

    const famId = familiaEmAvaliacao.value.id

    // 1. Gravar a avaliação (registro imutável)
    avaliacoesMap.value[famId] = resultado

    // 2. Atualizar o resumo na família
    const idx = familias.value.findIndex(f => f.id === famId)
    if (idx !== -1) {
      familias.value[idx] = {
        ...familias.value[idx],
        ultimaClassificacaoRisco: resultado.classificacao,
        ultimaPontuacaoRisco: resultado.pontuacaoTotal,
        dataUltimaAvaliacao: resultado.dataAvaliacao
      }
    }

    fecharModalAvaliacao()

    // Abre o drawer para conferir o resultado e delta
    const famAtualizada = familias.value.find(f => f.id === famId)
    if (famAtualizada) {
      abrirDrawerExplicativo(famAtualizada)
    }
  }

  return {
    familias,
    familiasFiltradas,
    contagemRisco,
    filtroMunicipio,
    filtroFaixaRisco,
    termoBusca,
    familiaSelecionada,
    avaliacaoSelecionada,
    drawerAberto,
    familiaEmAvaliacao,
    modalAvaliacaoAberto,
    abrirDrawerExplicativo,
    fecharDrawer,
    iniciarNovaAvaliacao,
    fecharModalAvaliacao,
    salvarNovaAvaliacao
  }
}
