import { z } from 'zod'
import { FaixaRisco, IndicadorRiscoCodigo, TipoSentinela } from '../risk-engine/types'

/**
 * Schemas de validação Zod para persistência e integridade no Cloud Firestore
 */

export const FatorDeterminanteSchema = z.object({
  indicadorCodigo: z.nativeEnum(IndicadorRiscoCodigo),
  descricao: z.string().min(1),
  pontuacaoAtribuida: z.number().int().nonnegative(),
  tipoSentinela: z.nativeEnum(TipoSentinela),
  individuoId: z.string().optional(),
  individuoNome: z.string().optional()
})

export const ComparativoAvaliacaoSchema = z.object({
  avaliacaoAnteriorId: z.string().optional(),
  dataAvaliacaoAnterior: z.string().optional(),
  classificacaoAnterior: z.nativeEnum(FaixaRisco),
  pontuacaoAnterior: z.number().int().nonnegative(),
  variacaoPontos: z.number().int(),
  evolucaoRisco: z.enum(['AGRAVAMENTO', 'ESTAVEL', 'MELHORIA']),
  fatoresAdicionados: z.array(FatorDeterminanteSchema),
  fatoresResolvidos: z.array(FatorDeterminanteSchema)
})

export const AvaliacaoRiscoSchema = z.object({
  id: z.string().uuid().optional(),
  familiaId: z.string().min(1),
  equipeId: z.string().min(1),
  microareaId: z.string().min(1),
  municipioId: z.string().min(1), // 'coxim' ou 'corumba'
  avaliadorId: z.string().min(1),
  avaliadorNome: z.string().min(1),
  avaliadorCargo: z.enum(['ACS', 'ENFERMEIRO', 'MEDICO', 'OUTRO']),
  dataAvaliacao: z.string().datetime(),
  versaoEscala: z.string().min(1),
  pontuacaoTotal: z.number().int().nonnegative(),
  classificacao: z.nativeEnum(FaixaRisco),
  regraDecisao: z.string().min(1),
  fatoresDeterminantes: z.array(FatorDeterminanteSchema),
  comparativoAvaliacaoAnterior: ComparativoAvaliacaoSchema.optional()
})

export const IndividuoSchema = z.object({
  id: z.string().min(1),
  familiaId: z.string().min(1),
  nome: z.string().min(2),
  cns: z.string().length(15).regex(/^\d+$/, 'CNS deve conter 15 dígitos numéricos'),
  cpf: z.string().length(11).regex(/^\d+$/).optional(),
  dataNascimento: z.string(),
  sexo: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']),
  parentesco: z.string().min(1),
  condicoesCronicas: z.object({
    hipertenso: z.boolean().default(false),
    diabetico: z.boolean().default(false),
    acamado: z.boolean().default(false),
    deficienciaFisica: z.boolean().default(false),
    deficienciaMental: z.boolean().default(false),
    desnutricaoGrave: z.boolean().default(false),
    usoAbusivoDrogas: z.boolean().default(false)
  })
})

export const FamiliaSchema = z.object({
  id: z.string().min(1),
  prontuarioFamiliar: z.string().min(1),
  domicilioId: z.string().min(1),
  microareaId: z.string().min(1),
  equipeId: z.string().min(1),
  municipioId: z.string().min(1),
  responsavelNome: z.string().min(2),
  responsavelId: z.string().min(1),
  status: z.enum(['ATIVA', 'MUDOU_SE', 'DESMEMBRADA']).default('ATIVA'),
  quantidadeMembros: z.number().int().positive(),
  ultimaClassificacaoRisco: z.nativeEnum(FaixaRisco).default(FaixaRisco.SEM_RISCO_R0),
  ultimaPontuacaoRisco: z.number().int().nonnegative().default(0),
  dataUltimaAvaliacao: z.string().optional()
})

export const DomicilioSchema = z.object({
  id: z.string().min(1),
  logradouro: z.string().min(2),
  numero: z.string().min(1),
  bairro: z.string().min(1),
  cep: z.string().optional(),
  microareaId: z.string().min(1),
  quantidadeComodos: z.number().int().positive(),
  quantidadeMoradores: z.number().int().positive(),
  abastecimentoAgua: z.enum(['REDE_ENCANADA', 'POCO', 'CISTERNA', 'OUTRO']),
  esgotamentoSanitario: z.enum(['REDE_COLETORA', 'FOSSA_SEPTICA', 'CEU_ABERTO', 'OUTRO']),
  destinoLixo: z.enum(['COLETADO', 'QUEIMADO', 'ENTERRADO', 'CEU_ABERTO']),
  saneamentoInadequado: z.boolean(),
  adensamentoExcessivo: z.boolean() // moradores / comodos > 1
})

export type AvaliacaoRiscoDoc = z.infer<typeof AvaliacaoRiscoSchema>
export type IndividuoDoc = z.infer<typeof IndividuoSchema>
export type FamiliaDoc = z.infer<typeof FamiliaSchema>
export type DomicilioDoc = z.infer<typeof DomicilioSchema>
