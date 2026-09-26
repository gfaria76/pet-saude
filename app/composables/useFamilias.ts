import { ref, computed } from 'vue'
import {
  calcularEstratificacaoRisco,
  FaixaRisco,
  IndicadorRiscoCodigo,
  PerfilProfissional,
  type AvaliacaoAnteriorEntrada,
  type ContextoAvaliacao,
  type ResultadoEstratificacaoRisco
} from '~~/shared/domain/risk-engine'
import {
  montarDocumentoAvaliacao,
  type AvaliacaoRiscoDoc,
  type FamiliaDoc
} from '~~/shared/domain/schemas'

/**
 * Estado da tela do painel territorial.
 *
 * Enquanto a persistência no Firestore não existe (context/architecture.md),
 * os dados ficam em memória e são 100% SINTÉTICOS (LGPD). O fluxo já segue o
 * modelo real: histórico append-only por família, resumo da família derivado
 * da última avaliação e documento validado pelo Zod antes de "gravar".
 */

/** Avaliador da sessão de demonstração (fictício). Virá do Firebase Auth. */
const AVALIADOR_DEMO = {
  id: 'uid-demo-acs',
  nome: 'ACS Demonstração (Fictício)',
  perfil: PerfilProfissional.ACS
} as const

type FamiliaSemResumo = Omit<FamiliaDoc,
  'ultimaClassificacaoRisco' | 'ultimaPontuacaoRisco' | 'dataUltimaAvaliacao' | 'ultimaAvaliacaoId'>

const FAMILIAS_SINTETICAS: FamiliaSemResumo[] = [
  {
    id: 'fam-coxim-001', prontuarioFamiliar: 'CX-1042', domicilioId: 'dom-001',
    municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    responsavelNome: 'Maria Fictícia dos Santos', responsavelId: 'ind-001',
    status: 'ATIVA', quantidadeMembros: 4
  },
  {
    id: 'fam-coxim-002', prontuarioFamiliar: 'CX-1088', domicilioId: 'dom-002',
    municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    responsavelNome: 'Família Silva Exemplo', responsavelId: 'ind-002',
    status: 'ATIVA', quantidadeMembros: 3
  },
  {
    id: 'fam-corumba-003', prontuarioFamiliar: 'CB-2031', domicilioId: 'dom-003',
    municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-02',
    responsavelNome: 'Cidadã Teste Souza', responsavelId: 'ind-003',
    status: 'ATIVA', quantidadeMembros: 5
  },
  {
    id: 'fam-corumba-004', prontuarioFamiliar: 'CB-2095', domicilioId: 'dom-004',
    municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-03',
    responsavelNome: 'Cidadão Teste Lima', responsavelId: 'ind-004',
    status: 'ATIVA', quantidadeMembros: 2
  }
]

/** Visitas sintéticas, em ordem cronológica, calculadas pelo próprio motor. */
const VISITAS_SINTETICAS: Record<string, Array<{ data: string; indicadores: IndicadorRiscoCodigo[] }>> = {
  'fam-coxim-001': [
    { data: '2026-06-10T09:00:00.000Z', indicadores: [IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE, IndicadorRiscoCodigo.IND_DROGADICAO] },
    { data: '2026-09-18T14:30:00.000Z', indicadores: [IndicadorRiscoCodigo.IND_DESNUTRICAO_GRAVE, IndicadorRiscoCodigo.IND_DROGADICAO, IndicadorRiscoCodigo.IND_ACAMADO] }
  ],
  'fam-coxim-002': [
    { data: '2026-09-15T09:15:00.000Z', indicadores: [IndicadorRiscoCodigo.IND_DESEMPREGO, IndicadorRiscoCodigo.IND_DROGADICAO, IndicadorRiscoCodigo.IND_HIPERTENSAO] }
  ],
  'fam-corumba-003': [
    { data: '2026-09-10T11:00:00.000Z', indicadores: [IndicadorRiscoCodigo.IND_HIPERTENSAO, IndicadorRiscoCodigo.IND_DIABETES, IndicadorRiscoCodigo.IND_MAIOR_70_ANOS] }
  ],
  'fam-corumba-004': [
    { data: '2026-08-20T16:00:00.000Z', indicadores: [] }
  ]
}

let sequencialAvaliacao = 0
const novoIdAvaliacao = () => `aval-demo-${String(++sequencialAvaliacao).padStart(4, '0')}`

function paraEntradaAnterior(doc: AvaliacaoRiscoDoc | undefined): AvaliacaoAnteriorEntrada | undefined {
  if (!doc) return undefined
  return {
    id: doc.id,
    data: doc.dataAvaliacao,
    pontuacao: doc.pontuacaoTotal,
    classificacao: doc.classificacao,
    fatores: doc.fatoresDeterminantes
  }
}

/** Valida o resultado do motor e o transforma em documento de avaliação (append-only). */
function registrarAvaliacao(
  familia: FamiliaSemResumo,
  resultado: ResultadoEstratificacaoRisco,
  avaliadorNome: string
): AvaliacaoRiscoDoc {
  return {
    ...montarDocumentoAvaliacao(resultado, {
      familiaId: familia.id,
      avaliadorNome,
      territorio: { municipioId: familia.municipioId, equipeId: familia.equipeId, microareaId: familia.microareaId }
    }),
    id: novoIdAvaliacao()
  }
}

/** O resumo da família é sempre derivado da última avaliação (mesma regra de firestore.rules). */
function comResumo(familia: FamiliaSemResumo, ultima: AvaliacaoRiscoDoc | undefined): FamiliaDoc {
  if (!ultima) {
    return { ...familia, ultimaClassificacaoRisco: FaixaRisco.SEM_RISCO_R0, ultimaPontuacaoRisco: 0 }
  }
  return {
    ...familia,
    ultimaClassificacaoRisco: ultima.classificacao,
    ultimaPontuacaoRisco: ultima.pontuacaoTotal,
    dataUltimaAvaliacao: ultima.dataAvaliacao,
    ultimaAvaliacaoId: ultima.id
  }
}

function gerarHistoricoSintetico(): Record<string, AvaliacaoRiscoDoc[]> {
  const historico: Record<string, AvaliacaoRiscoDoc[]> = {}
  for (const familia of FAMILIAS_SINTETICAS) {
    const avaliacoes: AvaliacaoRiscoDoc[] = []
    for (const visita of VISITAS_SINTETICAS[familia.id] ?? []) {
      const contexto: ContextoAvaliacao = {
        dataAvaliacao: visita.data,
        avaliadorId: AVALIADOR_DEMO.id,
        avaliadorPerfil: AVALIADOR_DEMO.perfil
      }
      const resultado = calcularEstratificacaoRisco(
        {
          familiaId: familia.id,
          indicadores: visita.indicadores.map(codigo => ({ codigo, ativo: true })),
          avaliacaoAnterior: paraEntradaAnterior(avaliacoes.at(-1))
        },
        contexto
      )
      avaliacoes.push(registrarAvaliacao(familia, resultado, AVALIADOR_DEMO.nome))
    }
    historico[familia.id] = avaliacoes
  }
  return historico
}

export function useFamilias() {
  /** Histórico append-only de avaliações por família (mais antiga → mais recente). */
  const historicoAvaliacoes = ref<Record<string, AvaliacaoRiscoDoc[]>>(gerarHistoricoSintetico())

  const familias = computed<FamiliaDoc[]>(() =>
    FAMILIAS_SINTETICAS.map(f => comResumo(f, historicoAvaliacoes.value[f.id]?.at(-1)))
  )

  const filtroMunicipio = ref<string>('todos')
  const filtroFaixaRisco = ref<FaixaRisco | 'TODAS'>('TODAS')
  const termoBusca = ref<string>('')

  // Drawer explicativo
  const familiaSelecionadaId = ref<string | null>(null)
  const drawerAberto = ref(false)

  // Formulário de nova avaliação (referência própria: não depende do drawer)
  const familiaEmAvaliacaoId = ref<string | null>(null)
  const modalAvaliacaoAberto = ref(false)

  const familiaSelecionada = computed(() => familias.value.find(f => f.id === familiaSelecionadaId.value) ?? null)
  const familiaEmAvaliacao = computed(() => familias.value.find(f => f.id === familiaEmAvaliacaoId.value) ?? null)

  const ultimaAvaliacao = (familiaId: string | null) =>
    familiaId ? historicoAvaliacoes.value[familiaId]?.at(-1) ?? null : null

  const avaliacaoSelecionada = computed(() => ultimaAvaliacao(familiaSelecionadaId.value))
  const totalAvaliacoesSelecionada = computed(() =>
    familiaSelecionadaId.value ? historicoAvaliacoes.value[familiaSelecionadaId.value]?.length ?? 0 : 0
  )

  /** Avaliação anterior entregue ao formulário, para o delta explicativo. */
  const avaliacaoAnteriorParaForm = computed(() => paraEntradaAnterior(ultimaAvaliacao(familiaEmAvaliacaoId.value) ?? undefined))

  /** Quem avalia e quando: fixado ao abrir o formulário (prévia e registro usam o mesmo). */
  const contextoFormulario = ref<ContextoAvaliacao | null>(null)

  const familiasDoMunicipio = computed(() =>
    familias.value.filter(f => filtroMunicipio.value === 'todos' || f.municipioId === filtroMunicipio.value)
  )

  // Contagem por faixa respeitando o município selecionado (mesma base do total do painel)
  const contagemRisco = computed(() => {
    const contagem: Record<FaixaRisco, number> = {
      [FaixaRisco.SEM_RISCO_R0]: 0,
      [FaixaRisco.RISCO_MENOR_R1]: 0,
      [FaixaRisco.RISCO_MEDIO_R2]: 0,
      [FaixaRisco.RISCO_MAIOR_R3]: 0
    }
    for (const fam of familiasDoMunicipio.value) {
      contagem[fam.ultimaClassificacaoRisco]++
    }
    return contagem
  })

  const familiasFiltradas = computed(() => {
    const busca = termoBusca.value.trim().toLowerCase()
    return familiasDoMunicipio.value.filter(fam => {
      if (filtroFaixaRisco.value !== 'TODAS' && fam.ultimaClassificacaoRisco !== filtroFaixaRisco.value) {
        return false
      }
      if (busca) {
        return fam.responsavelNome.toLowerCase().includes(busca)
          || fam.prontuarioFamiliar.toLowerCase().includes(busca)
      }
      return true
    })
  })

  function abrirDrawerExplicativo(familia: FamiliaDoc) {
    familiaSelecionadaId.value = familia.id
    drawerAberto.value = true
  }

  function fecharDrawer() {
    drawerAberto.value = false
    familiaSelecionadaId.value = null
  }

  function iniciarNovaAvaliacao(familia: FamiliaDoc) {
    familiaEmAvaliacaoId.value = familia.id
    contextoFormulario.value = {
      dataAvaliacao: new Date().toISOString(),
      avaliadorId: AVALIADOR_DEMO.id,
      avaliadorPerfil: AVALIADOR_DEMO.perfil
    }
    modalAvaliacaoAberto.value = true
    fecharDrawer()
  }

  function fecharModalAvaliacao() {
    modalAvaliacaoAberto.value = false
    familiaEmAvaliacaoId.value = null
    contextoFormulario.value = null
  }

  function salvarNovaAvaliacao(resultado: ResultadoEstratificacaoRisco) {
    const familia = FAMILIAS_SINTETICAS.find(f => f.id === familiaEmAvaliacaoId.value)
    if (!familia) return

    // Append-only: nunca sobrescreve a avaliação anterior.
    const doc = registrarAvaliacao(familia, resultado, AVALIADOR_DEMO.nome)
    historicoAvaliacoes.value[familia.id] = [...(historicoAvaliacoes.value[familia.id] ?? []), doc]

    fecharModalAvaliacao()
    abrirDrawerExplicativo(comResumo(familia, doc))
  }

  return {
    familias,
    familiasFiltradas,
    contagemRisco,
    totalFamiliasMunicipio: computed(() => familiasDoMunicipio.value.length),
    filtroMunicipio,
    filtroFaixaRisco,
    termoBusca,
    familiaSelecionada,
    avaliacaoSelecionada,
    totalAvaliacoesSelecionada,
    drawerAberto,
    familiaEmAvaliacao,
    avaliacaoAnteriorParaForm,
    modalAvaliacaoAberto,
    contextoFormulario,
    abrirDrawerExplicativo,
    fecharDrawer,
    iniciarNovaAvaliacao,
    fecharModalAvaliacao,
    salvarNovaAvaliacao
  }
}
