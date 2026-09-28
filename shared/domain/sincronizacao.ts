import { z } from 'zod'
import { AvaliacaoRiscoSchema } from './schemas'
import { IndicadorRiscoCodigo } from './risk-engine/types'

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/)
/** Respostas completas, inclusive negativas. Ausência nunca equivale a resposta negativa. */
export const OperacaoAvaliacaoSchema = z.object({
  operacaoId: z.uuid(),
  tenantId: id,
  familiaId: id,
  versaoCadastroBase: z.number().int().nonnegative(),
  avaliacaoAnteriorId: id.nullable(),
  versaoEscala: z.string().min(1).max(64),
  indicadores: z.array(z.object({
    codigo: z.enum(IndicadorRiscoCodigo),
    ativo: z.boolean(),
    individuoId: id.optional()
  }).strict()).length(Object.values(IndicadorRiscoCodigo).length)
    .refine(items => new Set(items.map(i => i.codigo)).size === Object.values(IndicadorRiscoCodigo).length,
      'Todos os indicadores devem ser respondidos uma única vez'),
  coletadoEm: z.iso.datetime({ offset: true })
}).strict()
export type OperacaoAvaliacao = z.infer<typeof OperacaoAvaliacaoSchema>
const reciboBase = {
  operacaoId: z.uuid(),
  registradoEm: z.iso.datetime({ offset: true })
}
export const ReciboOperacaoSchema = z.discriminatedUnion('status', [
  z.object({ ...reciboBase, status: z.literal('CONFIRMADA'), avaliacaoId: id }).strict(),
  z.object({
    ...reciboBase,
    status: z.literal('CONFLITO'),
    motivo: z.enum(['CADASTRO_ALTERADO', 'AVALIACAO_ALTERADA'])
  }).strict()
])
export type ReciboOperacao = z.infer<typeof ReciboOperacaoSchema>

/** registradoEm do Firestore é acrescentado pelo servidor, fora do domínio. */
export const RegistroOperacaoSchema = z.object({
  uid: id,
  municipioId: id,
  conteudoHash: z.string().regex(/^[a-f0-9]{64}$/),
  recibo: ReciboOperacaoSchema,
  operacao: OperacaoAvaliacaoSchema.optional()
}).superRefine((registro, ctx) => {
  if (registro.recibo.status === 'CONFLITO') {
    if (!registro.operacao || registro.operacao.operacaoId !== registro.recibo.operacaoId
      || registro.operacao.tenantId !== registro.municipioId) {
      ctx.addIssue({ code: 'custom', path: ['operacao'], message: 'Conflito exige operação original do mesmo município e identificador' })
    }
  } else if (registro.operacao) {
    ctx.addIssue({ code: 'custom', path: ['operacao'], message: 'Recibo confirmado não duplica respostas clínicas' })
  }
})
export type RegistroOperacao = z.infer<typeof RegistroOperacaoSchema>

export const AvaliacaoCanonicaSchema = AvaliacaoRiscoSchema.and(z.object({
  respostas: OperacaoAvaliacaoSchema.shape.indicadores,
  operacaoId: z.uuid()
}))
export type AvaliacaoCanonica = z.infer<typeof AvaliacaoCanonicaSchema>
