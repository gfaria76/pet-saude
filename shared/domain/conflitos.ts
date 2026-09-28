import { z } from 'zod'
import { OperacaoAvaliacaoSchema, ReciboOperacaoSchema } from './sincronizacao'

export const ConsultaConflitosSchema = z.object({
  tenantId: OperacaoAvaliacaoSchema.shape.tenantId,
  operacaoId: z.uuid().optional(),
  cursor: z.string().regex(/^[a-f0-9]{64}$/).optional()
}).strict()
export const ResumoConflitoSchema = z.object({
  operacaoId: z.uuid(), familiaId: OperacaoAvaliacaoSchema.shape.familiaId,
  registradoEm: z.iso.datetime({ offset: true }),
  motivo: z.enum(['CADASTRO_ALTERADO', 'AVALIACAO_ALTERADA'])
})
export const RevisaoConflitoSchema = z.object({
  operacao: OperacaoAvaliacaoSchema,
  recibo: ReciboOperacaoSchema,
  familia: z.object({
    id: OperacaoAvaliacaoSchema.shape.familiaId, versaoCadastro: z.number().int().nonnegative(),
    ultimaAvaliacaoId: z.string().nullable(), status: z.enum(['ATIVA', 'MUDOU_SE', 'DESMEMBRADA'])
  }),
  avaliacaoAtual: z.object({
    id: z.string(), dataAvaliacao: z.string(), versaoEscala: z.string(),
    respostas: OperacaoAvaliacaoSchema.shape.indicadores
  }).nullable()
})
export const ResultadoConsultaConflitosSchema = z.object({
  conflitos: z.array(ResumoConflitoSchema), detalhe: RevisaoConflitoSchema.optional(),
  proximoCursor: z.string().nullable()
})
export type RevisaoConflito = z.infer<typeof RevisaoConflitoSchema>
export type ResumoConflito = z.infer<typeof ResumoConflitoSchema>
