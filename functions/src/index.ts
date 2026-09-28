import { getApps, initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions'

if (!getApps().length) initializeApp()
setGlobalOptions({ maxInstances: 10, region: 'southamerica-east1' })

export { listarMeusVinculos, selecionarTenant, gerirVinculo, consultarVinculo } from './acesso'
export { registrarAvaliacao } from './avaliacoes'
export { registrarCadastro } from './cadastros'
export { consultarConflitos } from './conflitos'
