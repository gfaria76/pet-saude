import { getFunctions, httpsCallable } from 'firebase/functions'
import type { FirebaseApp } from 'firebase/app'
import { OperacaoAvaliacaoSchema, ReciboOperacaoSchema, type OperacaoAvaliacao, type ReciboOperacao } from '~~/shared/domain/sincronizacao'
import type { EnviarOperacao } from '../offline/fila'

/** Adapter compartilhado pelo envio online e pela fila quando o armazenamento clínico for autorizado. */
export function criarEnvioOperacao(app: FirebaseApp): EnviarOperacao {
  const enviar = httpsCallable<OperacaoAvaliacao, ReciboOperacao>(getFunctions(app, 'southamerica-east1'), 'registrarAvaliacao')
  return async operacao => ReciboOperacaoSchema.parse((await enviar(OperacaoAvaliacaoSchema.parse(operacao))).data)
}
