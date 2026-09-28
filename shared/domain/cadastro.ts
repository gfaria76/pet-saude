import { z } from 'zod'
import { identificadorAcessoSchema } from './acesso'
import { DomicilioSchema, IndividuoSchema, FamiliaSchema } from './schemas'
const territorio = { id: true, municipioId: true, equipeId: true, microareaId: true } as const
export const DomicilioCadastroSchema = DomicilioSchema.omit(territorio).strict().refine(
  d => d.adensamentoExcessivo === (d.quantidadeMoradores / d.quantidadeComodos > 1),
  { message: 'Adensamento incompatível com moradores e cômodos', path: ['adensamentoExcessivo'] }
)
export const ResponsavelCadastroSchema = IndividuoSchema.omit({ ...territorio, familiaId: true }).strict()
const comum = { operacaoId: z.uuid(), tenantId: identificadorAcessoSchema }
const existente = { ...comum, familiaId: identificadorAcessoSchema, versaoCadastroBase: z.number().int().nonnegative() }
const destino = { equipeId: identificadorAcessoSchema.max(64), microareaId: identificadorAcessoSchema.max(64) }
export const OperacaoCadastroSchema = z.discriminatedUnion('tipo', [
  z.object({ ...comum, ...destino, tipo: z.literal('CRIAR'), prontuarioFamiliar: FamiliaSchema.shape.prontuarioFamiliar,
    contato: FamiliaSchema.shape.contato, domicilio: DomicilioCadastroSchema, responsavel: ResponsavelCadastroSchema }).strict(),
  z.object({ ...existente, tipo: z.literal('ATUALIZAR'), prontuarioFamiliar: FamiliaSchema.shape.prontuarioFamiliar,
    contato: FamiliaSchema.shape.contato, status: FamiliaSchema.shape.status }).strict(),
  z.object({ ...existente, ...destino, tipo: z.literal('TRANSFERIR') }).strict()
])
export const ReciboCadastroSchema = z.object({ operacaoId: z.uuid(), status: z.enum(['CONFIRMADA', 'CONFLITO']),
  familiaId: identificadorAcessoSchema, versaoCadastro: z.number().int().nonnegative(), registradoEm: z.iso.datetime({ offset: true }) }).strict()
export const RegistroCadastroSchema = z.object({ uid: identificadorAcessoSchema, municipioId: identificadorAcessoSchema,
  conteudoHash: z.string().regex(/^[a-f0-9]{64}$/), recibo: ReciboCadastroSchema }).strict()
export type OperacaoCadastro = z.infer<typeof OperacaoCadastroSchema>
export type ReciboCadastro = z.infer<typeof ReciboCadastroSchema>
