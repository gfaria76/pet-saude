import { ref, computed, provide, inject, hasInjectionContext, type InjectionKey } from 'vue'
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
  type FamiliaDoc,
  type DomicilioDoc,
  type IndividuoDoc,
  type MicroareaDoc
} from '~~/shared/domain/schemas'
import { agregarRiscoPorMicroarea, type AgregacaoMicroarea } from '~/utils/mapaCalorRisco'

/**
 * Estado da tela do painel territorial e prontuário familiar.
 *
 * Enquanto a persistência no Firestore não existe (context/architecture.md),
 * os dados ficam em memória e são 100% SINTÉTICOS (LGPD). O fluxo segue o
 * modelo real: histórico append-only por família, resumo da família derivado
 * da última avaliação e documento validado pelo Zod antes de "gravar".
 */

/** Avaliador da sessão de demonstração (fictício). Virá do Firebase Auth. */
export const AVALIADOR_DEMO = {
  id: 'uid-demo-acs',
  nome: 'ACS Demonstração (Fictício)',
  perfil: PerfilProfissional.ACS
} as const

type FamiliaSemResumo = Omit<FamiliaDoc,
  'ultimaClassificacaoRisco' | 'ultimaPontuacaoRisco' | 'dataUltimaAvaliacao' | 'ultimaAvaliacaoId'>

export const FAMILIAS_SINTETICAS: FamiliaSemResumo[] = [
  {
    id: 'fam-coxim-001', prontuarioFamiliar: 'CX-1042', domicilioId: 'dom-001',
    municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    responsavelNome: 'Maria Fictícia dos Santos', responsavelId: 'ind-001',
    status: 'ATIVA', quantidadeMembros: 4, contato: '(67) 99123-0001'
  },
  {
    id: 'fam-coxim-002', prontuarioFamiliar: 'CX-1088', domicilioId: 'dom-002',
    municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    responsavelNome: 'Família Silva Exemplo', responsavelId: 'ind-005',
    status: 'ATIVA', quantidadeMembros: 3, contato: '(67) 99123-0002'
  },
  {
    id: 'fam-corumba-003', prontuarioFamiliar: 'CB-2031', domicilioId: 'dom-003',
    municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-02',
    responsavelNome: 'Cidadã Teste Souza', responsavelId: 'ind-008',
    status: 'ATIVA', quantidadeMembros: 5, contato: '(67) 99123-0003'
  },
  {
    id: 'fam-corumba-004', prontuarioFamiliar: 'CB-2095', domicilioId: 'dom-004',
    municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-03',
    responsavelNome: 'Cidadão Teste Lima', responsavelId: 'ind-013',
    status: 'ATIVA', quantidadeMembros: 2, contato: '(67) 99123-0004'
  }
]

export const DOMICILIOS_SINTETICOS: DomicilioDoc[] = [
  {
    id: 'dom-001',
    municipioId: 'coxim',
    equipeId: 'ESF-PANTANAL-01',
    microareaId: 'MA-01',
    logradouro: 'Rua das Palmeiras Pantaneiras',
    numero: '142',
    bairro: 'Senhor Divino',
    cep: '79400000',
    quantidadeComodos: 4,
    quantidadeMoradores: 4,
    abastecimentoAgua: 'REDE_ENCANADA',
    esgotamentoSanitario: 'FOSSA_SEPTICA',
    destinoLixo: 'COLETADO',
    saneamentoInadequado: false,
    adensamentoExcessivo: false
  },
  {
    id: 'dom-002',
    municipioId: 'coxim',
    equipeId: 'ESF-PANTANAL-01',
    microareaId: 'MA-01',
    logradouro: 'Avenida Beira Rio',
    numero: '88',
    bairro: 'Piracema',
    cep: '79400000',
    quantidadeComodos: 2,
    quantidadeMoradores: 3,
    abastecimentoAgua: 'REDE_ENCANADA',
    esgotamentoSanitario: 'FOSSA_SEPTICA',
    destinoLixo: 'COLETADO',
    saneamentoInadequado: false,
    adensamentoExcessivo: true
  },
  {
    id: 'dom-003',
    municipioId: 'corumba',
    equipeId: 'ESF-FRONTEIRA-02',
    microareaId: 'MA-02',
    logradouro: 'Rua Frei Mariano',
    numero: '1030',
    bairro: 'Centro',
    cep: '79300000',
    quantidadeComodos: 5,
    quantidadeMoradores: 5,
    abastecimentoAgua: 'REDE_ENCANADA',
    esgotamentoSanitario: 'REDE_COLETORA',
    destinoLixo: 'COLETADO',
    saneamentoInadequado: false,
    adensamentoExcessivo: false
  },
  {
    id: 'dom-004',
    municipioId: 'corumba',
    equipeId: 'ESF-FRONTEIRA-02',
    microareaId: 'MA-03',
    logradouro: 'Alameda Tamandaré',
    numero: '45',
    bairro: 'Cervejaria',
    cep: '79300000',
    quantidadeComodos: 3,
    quantidadeMoradores: 2,
    abastecimentoAgua: 'REDE_ENCANADA',
    esgotamentoSanitario: 'REDE_COLETORA',
    destinoLixo: 'COLETADO',
    saneamentoInadequado: false,
    adensamentoExcessivo: false
  }
]

/**
 * Centroides aproximados e 100% sintéticos das microáreas de demonstração,
 * usados só pelo mapa de calor territorial do dashboard. Nunca representam
 * o endereço de uma família (minimização LGPD).
 */
export const MICROAREAS_SINTETICAS: MicroareaDoc[] = [
  { id: 'MA-01', numero: '01', descricao: 'Senhor Divino / Piracema', municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', latitude: -18.5013, longitude: -54.7592 },
  { id: 'MA-02', numero: '02', descricao: 'Centro', municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', latitude: -19.0092, longitude: -57.6516 },
  { id: 'MA-03', numero: '03', descricao: 'Cervejaria', municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', latitude: -19.0180, longitude: -57.6440 }
]

export const INDIVIDUOS_SINTETICOS: IndividuoDoc[] = [
  // Família CX-1042 (Maria Fictícia)
  {
    id: 'ind-001', familiaId: 'fam-coxim-001', municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    nome: 'Maria Fictícia dos Santos', dataNascimento: '1958-03-12', sexo: 'FEMININO', parentesco: 'Responsável Familiar',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: true, usoAbusivoDrogas: false }
  },
  {
    id: 'ind-002', familiaId: 'fam-coxim-001', municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    nome: 'João Fictício dos Santos', dataNascimento: '1984-07-22', sexo: 'MASCULINO', parentesco: 'Filho',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: true, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: true }
  },
  {
    id: 'ind-003', familiaId: 'fam-coxim-001', municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    nome: 'Ana Fictícia dos Santos', dataNascimento: '2006-11-05', sexo: 'FEMININO', parentesco: 'Neta',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
  },
  {
    id: 'ind-004', familiaId: 'fam-coxim-001', municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    nome: 'Lucas Fictício dos Santos', dataNascimento: '2026-05-20', sexo: 'MASCULINO', parentesco: 'Bisneto',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
  },
  // Família CX-1088 (Silva Exemplo)
  {
    id: 'ind-005', familiaId: 'fam-coxim-002', municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    nome: 'Carlos Silva Exemplo', dataNascimento: '1980-04-15', sexo: 'MASCULINO', parentesco: 'Responsável Familiar',
    condicoesCronicas: { hipertenso: true, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
  },
  {
    id: 'ind-006', familiaId: 'fam-coxim-002', municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    nome: 'Beatriz Silva Exemplo', dataNascimento: '1982-08-30', sexo: 'FEMININO', parentesco: 'Cônjuge',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: true }
  },
  {
    id: 'ind-007', familiaId: 'fam-coxim-002', municipioId: 'coxim', equipeId: 'ESF-PANTANAL-01', microareaId: 'MA-01',
    nome: 'Daniel Silva Exemplo', dataNascimento: '2014-01-10', sexo: 'MASCULINO', parentesco: 'Filho',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
  },
  // Família CB-2031 (Teste Souza)
  {
    id: 'ind-008', familiaId: 'fam-corumba-003', municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-02',
    nome: 'Cidadã Teste Souza', dataNascimento: '1951-09-14', sexo: 'FEMININO', parentesco: 'Responsável Familiar',
    condicoesCronicas: { hipertenso: true, diabetico: true, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
  },
  {
    id: 'ind-009', familiaId: 'fam-corumba-003', municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-02',
    nome: 'Paulo Teste Souza', dataNascimento: '1949-12-03', sexo: 'MASCULINO', parentesco: 'Cônjuge',
    condicoesCronicas: { hipertenso: true, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
  },
  {
    id: 'ind-010', familiaId: 'fam-corumba-003', municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-02',
    nome: 'Cláudia Teste Souza', dataNascimento: '1978-02-18', sexo: 'FEMININO', parentesco: 'Filha',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
  },
  {
    id: 'ind-011', familiaId: 'fam-corumba-003', municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-02',
    nome: 'Marcos Teste Souza', dataNascimento: '2004-06-25', sexo: 'MASCULINO', parentesco: 'Neto',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
  },
  {
    id: 'ind-012', familiaId: 'fam-corumba-003', municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-02',
    nome: 'Rafael Teste Souza', dataNascimento: '2009-10-12', sexo: 'MASCULINO', parentesco: 'Neto',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
  },
  // Família CB-2095 (Teste Lima)
  {
    id: 'ind-013', familiaId: 'fam-corumba-004', municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-03',
    nome: 'Cidadão Teste Lima', dataNascimento: '1991-05-19', sexo: 'MASCULINO', parentesco: 'Responsável Familiar',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
  },
  {
    id: 'ind-014', familiaId: 'fam-corumba-004', municipioId: 'corumba', equipeId: 'ESF-FRONTEIRA-02', microareaId: 'MA-03',
    nome: 'Juliana Teste Lima', dataNascimento: '1994-09-08', sexo: 'FEMININO', parentesco: 'Cônjuge',
    condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false }
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

function criarEstadoFamilias() {
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

  // Formulário de nova avaliação modal (para uso inline opcional)
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

  // Agregação por microárea (prevalência de cada indicador) para o mapa de calor do dashboard.
  const agregacaoRiscoPorMicroarea = computed<AgregacaoMicroarea[]>(() =>
    agregarRiscoPorMicroarea(
      familiasDoMunicipio.value.map(familia => ({
        familia,
        ultimaAvaliacao: ultimaAvaliacao(familia.id)
      }))
    )
  )

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

  // Helpers auxiliares para roteamento e visualizações detalhadas
  function obterFamiliaPorId(id: string): FamiliaDoc | undefined {
    return familias.value.find(f => f.id === id)
  }

  function obterDomicilioPorId(domicilioId: string): DomicilioDoc | undefined {
    return DOMICILIOS_SINTETICOS.find(d => d.id === domicilioId)
  }

  function obterIndividuosPorFamilia(familiaId: string): IndividuoDoc[] {
    return INDIVIDUOS_SINTETICOS.filter(i => i.familiaId === familiaId)
  }

  function obterHistoricoFamilia(familiaId: string): AvaliacaoRiscoDoc[] {
    return historicoAvaliacoes.value[familiaId] ?? []
  }

  function obterAvaliacaoAnterior(familiaId: string): AvaliacaoAnteriorEntrada | undefined {
    return paraEntradaAnterior(ultimaAvaliacao(familiaId) ?? undefined)
  }

  return {
    familias,
    familiasFiltradas,
    contagemRisco,
    agregacaoRiscoPorMicroarea,
    microareas: MICROAREAS_SINTETICAS,
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
    salvarNovaAvaliacao,
    obterFamiliaPorId,
    obterDomicilioPorId,
    obterIndividuosPorFamilia,
    obterHistoricoFamilia,
    obterAvaliacaoAnterior
  }
}

export type EstadoFamilias = ReturnType<typeof criarEstadoFamilias>
export const FAMILIAS_INJECTION_KEY: InjectionKey<EstadoFamilias> = Symbol('FAMILIAS_INJECTION_KEY')

export function provideFamilias(): EstadoFamilias {
  const estado = criarEstadoFamilias()
  provide(FAMILIAS_INJECTION_KEY, estado)
  return estado
}

export function useFamilias(): EstadoFamilias {
  if (hasInjectionContext()) {
    const injetado = inject(FAMILIAS_INJECTION_KEY, null)
    if (injetado) return injetado
  }
  return criarEstadoFamilias()
}
