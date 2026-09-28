import { collection, documentId, getDocsFromServer, limit, orderBy, query, startAfter, where, type Firestore, type QueryConstraint } from 'firebase/firestore'
import { z } from 'zod'
import { claimsAcessoSchema, type ClaimsAcesso } from '~~/shared/domain/acesso'
import { FamiliaVersionadaSchema, AvaliacaoRiscoSchema, type FamiliaVersionada } from '~~/shared/domain/schemas'

export type { FamiliaVersionada } from '~~/shared/domain/schemas'
/** Consultas sempre incluem o escopo que as regras exigem; não habilita cache persistente. */
export function criarRepositorioFamilias(db: Firestore, escopo: ClaimsAcesso) {
  const claims = claimsAcessoSchema.parse(escopo)
  function filtros(): QueryConstraint[] {
    if (claims.perfil === 'ADMIN') throw new Error('ACESSO_SAUDE_NEGADO')
    const resultado: QueryConstraint[] = [where('municipioId', '==', claims.municipioId)]
    if (claims.perfil !== 'COORDENADOR_APS') resultado.push(where('equipeId', '==', claims.equipeId))
    if (claims.perfil === 'ACS') resultado.push(where('microareaId', 'in', claims.microareaIds))
    return resultado
  }
  async function listarPagina(opcoes: { apos?: string; tamanho?: number } = {}) {
    const tamanho = z.number().int().min(1).max(50).parse(opcoes.tamanho ?? 20)
    const restricoes = [...filtros(), orderBy(documentId()), limit(tamanho + 1)]
    if (opcoes.apos) restricoes.push(startAfter(z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/).parse(opcoes.apos)))
    const documentos = await getDocsFromServer(query(collection(db, 'tenants', claims.tenantId, 'familias'), ...restricoes))
    const pagina = documentos.docs.slice(0, tamanho)
    return {
      familias: pagina.map(doc => FamiliaVersionadaSchema.parse({ ...doc.data(), id: doc.id })),
      proximo: documentos.docs.length > tamanho ? pagina.at(-1)!.id : null
    }
  }
  return {
    listarPagina,
    async listar(): Promise<FamiliaVersionada[]> {
      return (await listarPagina()).familias
    },
    async historico(familiaId: string) {
      const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/).parse(familiaId)
      const documentos = await getDocsFromServer(query(collection(db, 'tenants', claims.tenantId, 'avaliacoes_risco'), ...filtros(), where('familiaId', '==', id)))
      return documentos.docs.map(doc => ({ ...AvaliacaoRiscoSchema.parse(doc.data()), id: doc.id, registradoEm: doc.data().registradoEm?.toDate?.().toISOString() as string | undefined }))
        .sort((a, b) => (b.registradoEm ?? b.dataAvaliacao).localeCompare(a.registradoEm ?? a.dataAvaliacao))
    }
  }
}
