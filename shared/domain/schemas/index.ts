import { z } from 'zod'
import {
  FaixaRisco,
  IndicadorRiscoCodigo,
  PerfilProfissional,
  TipoSentinela,
  type ResultadoEstratificacaoRisco
} from '../risk-engine/types'

/**
 * Schemas Zod = contrato de persistência no Cloud Firestore.
 * Mantenha em sincronia com firestore.rules (campos, tipos e limites de tamanho)
 * e com context/domain_model.md.
 *
 * Campos gravados pelo servidor (`registradoEm` = serverTimestamp()) não fazem
 * parte destes schemas: são acrescentados pela camada de repositório.
 */

const id = z.string().min(1).max(128)
const texto = (min: number, max: number) => z.string().min(min).max(max)
const dataHora = z.iso.datetime({ offset: true })

/** Campos territoriais denormalizados (usados por firestore.rules). */
export const TerritorioSchema = z.object({
  municipioId: texto(1, 64),
  equipeId: texto(1, 64),
  microareaId: texto(1, 64)
})

// ---------------------------------------------------------------
// Avaliação de risco
// ---------------------------------------------------------------

export const FatorDeterminanteSchema = z.object({
  indicadorCodigo: z.enum(IndicadorRiscoCodigo),
  descricao: texto(1, 200),
  pontuacaoAtribuida: z.number().int().nonnegative(),
  tipoSentinela: z.enum(TipoSentinela),
  individuoId: id.optional()
})

export const IndicadorNaoPontuadoSchema = z.object({
  indicadorCodigo: z.enum(IndicadorRiscoCodigo),
  descricao: texto(1, 200),
  tipoSentinela: z.enum(TipoSentinela),
  individuoId: id.optional()
})

export const ComparativoAvaliacaoSchema = z.object({
  avaliacaoAnteriorId: id.optional(),
  dataAvaliacaoAnterior: dataHora.optional(),
  classificacaoAnterior: z.enum(FaixaRisco),
  pontuacaoAnterior: z.number().int().min(0).max(200),
  variacaoPontos: z.number().int().min(-200).max(200),
  evolucaoRisco: z.enum(['AGRAVAMENTO', 'ESTAVEL', 'MELHORIA']),
  fatoresAdicionados: z.array(FatorDeterminanteSchema).max(50),
  fatoresResolvidos: z.array(FatorDeterminanteSchema).max(50)
})

export const AvaliacaoRiscoSchema = TerritorioSchema.extend({
  id: id.optional(),
  familiaId: id,
  avaliadorId: id,
  avaliadorNome: texto(1, 120),
  avaliadorPerfil: z.enum(PerfilProfissional),
  dataAvaliacao: dataHora,
  versaoEscala: texto(1, 64),
  pontuacaoTotal: z.number().int().min(0).max(200),
  classificacao: z.enum(FaixaRisco),
  regraDecisao: texto(1, 500),
  fatoresDeterminantes: z.array(FatorDeterminanteSchema).max(50),
  indicadoresNaoPontuados: z.array(IndicadorNaoPontuadoSchema).max(50).optional(),
  comparativoAvaliacaoAnterior: ComparativoAvaliacaoSchema.optional()
}).refine(
  a => a.fatoresDeterminantes.reduce((soma, f) => soma + f.pontuacaoAtribuida, 0) === a.pontuacaoTotal,
  { message: 'Soma dos fatores determinantes difere da pontuação total (invariante de explicabilidade)', path: ['pontuacaoTotal'] }
)

// ---------------------------------------------------------------
// Território, domicílio, família e indivíduo
// ---------------------------------------------------------------

export const MicroareaSchema = z.object({
  id,
  numero: texto(1, 16),
  descricao: texto(0, 200).optional(),
  acsId: id.optional(),
  equipeId: texto(1, 64),
  municipioId: texto(1, 64)
})

export const DomicilioSchema = TerritorioSchema.extend({
  id,
  logradouro: texto(2, 200),
  numero: texto(1, 20),
  bairro: texto(1, 120),
  cep: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos').optional(),
  quantidadeComodos: z.number().int().min(1).max(100),
  quantidadeMoradores: z.number().int().min(1).max(100),
  abastecimentoAgua: z.enum(['REDE_ENCANADA', 'POCO', 'CISTERNA', 'OUTRO']),
  esgotamentoSanitario: z.enum(['REDE_COLETORA', 'FOSSA_SEPTICA', 'CEU_ABERTO', 'OUTRO']),
  destinoLixo: z.enum(['COLETADO', 'QUEIMADO', 'ENTERRADO', 'CEU_ABERTO']),
  saneamentoInadequado: z.boolean(),
  adensamentoExcessivo: z.boolean() // moradores / cômodos > 1
})

export const FamiliaSchema = TerritorioSchema.extend({
  id,
  prontuarioFamiliar: texto(1, 32),
  domicilioId: id,
  responsavelNome: texto(2, 120),
  responsavelId: id,
  /** Previsto no Relatório Técnico (endereço/contato). */
  contato: texto(1, 80).optional(),
  status: z.enum(['ATIVA', 'MUDOU_SE', 'DESMEMBRADA']),
  quantidadeMembros: z.number().int().min(1).max(50),
  // Resumo da última avaliação (cópia para o painel; fonte da verdade = avaliacoes_risco)
  ultimaClassificacaoRisco: z.enum(FaixaRisco),
  ultimaPontuacaoRisco: z.number().int().min(0).max(200),
  dataUltimaAvaliacao: dataHora.optional(),
  ultimaAvaliacaoId: id.optional()
})

export const IndividuoSchema = TerritorioSchema.extend({
  id,
  familiaId: id,
  nome: texto(2, 120),
  /** Opcionais: o Relatório Técnico não exige CNS/CPF (minimização LGPD). */
  cns: z.string().regex(/^\d{15}$/, 'CNS deve conter 15 dígitos numéricos').optional(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos numéricos').optional(),
  dataNascimento: z.iso.date(),
  sexo: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']),
  parentesco: texto(1, 40),
  condicoesCronicas: z.object({
    hipertenso: z.boolean(),
    diabetico: z.boolean(),
    acamado: z.boolean(),
    deficienciaFisica: z.boolean(),
    deficienciaMental: z.boolean(),
    desnutricaoGrave: z.boolean(),
    usoAbusivoDrogas: z.boolean()
  })
})

// ---------------------------------------------------------------
// Auditoria (append-only; nunca contém nome, CPF, CNS ou condição de saúde)
// ---------------------------------------------------------------

export const AcaoAuditoria = z.enum([
  'CRIAR_FAMILIA', 'ATUALIZAR_FAMILIA', 'INATIVAR_FAMILIA',
  'CRIAR_DOMICILIO', 'ATUALIZAR_DOMICILIO',
  'CRIAR_INDIVIDUO', 'ATUALIZAR_INDIVIDUO',
  'CRIAR_AVALIACAO_RISCO', 'CONSULTAR_FAMILIA',
  'CRIAR_MICROAREA', 'ATUALIZAR_MICROAREA'
])

export const RecursoAuditoria = z.enum(['FAMILIA', 'DOMICILIO', 'INDIVIDUO', 'AVALIACAO_RISCO', 'MICROAREA'])

export const LogAuditoriaSchema = z.object({
  usuarioId: id,
  perfil: z.enum(PerfilProfissional),
  municipioId: texto(1, 64),
  acao: AcaoAuditoria,
  recursoTipo: RecursoAuditoria,
  /** Identificador anônimo/hasheado do recurso. */
  recursoId: id,
  dataHora: dataHora,
  justificativa: texto(1, 500).optional()
})

/**
 * Converte o resultado do motor no documento persistível, validando-o.
 * Lança ZodError se a avaliação violar o contrato (ex.: soma ≠ total).
 */
export function montarDocumentoAvaliacao(
  resultado: ResultadoEstratificacaoRisco,
  dados: { familiaId: string; avaliadorNome: string; territorio: z.infer<typeof TerritorioSchema> }
): AvaliacaoRiscoDoc {
  return AvaliacaoRiscoSchema.parse({
    ...dados.territorio,
    familiaId: dados.familiaId,
    avaliadorId: resultado.avaliadorId,
    avaliadorNome: dados.avaliadorNome,
    avaliadorPerfil: resultado.avaliadorPerfil,
    dataAvaliacao: resultado.dataAvaliacao,
    versaoEscala: resultado.versaoEscala,
    pontuacaoTotal: resultado.pontuacaoTotal,
    classificacao: resultado.classificacao,
    regraDecisao: resultado.regraDecisao,
    fatoresDeterminantes: resultado.fatoresDeterminantes,
    indicadoresNaoPontuados: resultado.indicadoresNaoPontuados,
    comparativoAvaliacaoAnterior: resultado.comparativoAvaliacaoAnterior
  })
}

export type AvaliacaoRiscoDoc = z.infer<typeof AvaliacaoRiscoSchema>
export type IndividuoDoc = z.infer<typeof IndividuoSchema>
export type FamiliaDoc = z.infer<typeof FamiliaSchema>
export type DomicilioDoc = z.infer<typeof DomicilioSchema>
export type MicroareaDoc = z.infer<typeof MicroareaSchema>
export type LogAuditoriaDoc = z.infer<typeof LogAuditoriaSchema>
