import { z } from 'zod'
import { PerfilProfissional } from './risk-engine/types'

export const identificadorAcessoSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/)
const campos = {
  tenantId: identificadorAcessoSchema,
  municipioId: identificadorAcessoSchema,
  perfil: z.enum(PerfilProfissional),
  equipeId: identificadorAcessoSchema.optional(),
  microareaIds: z.array(identificadorAcessoSchema).max(20),
  versaoAcesso: z.number().int().positive()
}
function territorioValido(v: z.infer<z.ZodObject<typeof campos>>) {
  return v.tenantId === v.municipioId
    && (['ADMIN', 'COORDENADOR_APS'].includes(v.perfil) || Boolean(v.equipeId))
    && (v.perfil !== 'ACS' || v.microareaIds.length > 0)
    && new Set(v.microareaIds).size === v.microareaIds.length
}
export const claimsAcessoSchema = z.object(campos).refine(territorioValido, 'Território incompatível com o perfil')
export const vinculoSchema = z.object({
  ...campos, uid: identificadorAcessoSchema, status: z.enum(['ATIVO', 'INATIVO'])
}).strict().refine(territorioValido, 'Território incompatível com o perfil')
export type ClaimsAcesso = z.infer<typeof claimsAcessoSchema>
export type VinculoInstitucional = z.infer<typeof vinculoSchema>

export const TenantSchema = z.object({
  municipioId: identificadorAcessoSchema,
  nome: z.string().min(1).max(120)
}).strict()

/** Metadados administrativos; não inclui e-mail, nomes ou conteúdo clínico. */
export const LogAcessoSchema = z.object({
  municipioId: identificadorAcessoSchema,
  usuarioId: identificadorAcessoSchema,
  perfil: z.literal('ADMIN'),
  acao: z.enum(['APROVAR_VINCULO', 'REVOGAR_VINCULO']),
  recursoTipo: z.literal('vinculo'),
  recursoId: identificadorAcessoSchema,
  dataHora: z.iso.datetime({ offset: true })
}).strict()

export function identidadeInstitucionalValida(email: unknown, verificado: unknown, provedor: unknown): boolean {
  return typeof email === 'string' && /^[^\s@]+@ufms\.br$/i.test(email)
    && verificado === true && provedor === 'google.com'
}
export function vinculoVigente(claims: ClaimsAcesso, vinculo: VinculoInstitucional, uid: string): boolean {
  return vinculo.uid === uid && vinculo.status === 'ATIVO'
    && claims.tenantId === vinculo.tenantId && claims.municipioId === vinculo.municipioId
    && claims.versaoAcesso === vinculo.versaoAcesso && claims.perfil === vinculo.perfil
    && claims.equipeId === vinculo.equipeId
    && claims.microareaIds.length === vinculo.microareaIds.length
    && claims.microareaIds.every(id => vinculo.microareaIds.includes(id))
}
