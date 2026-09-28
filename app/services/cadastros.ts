import type { FirebaseApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { OperacaoCadastroSchema, ReciboCadastroSchema, type OperacaoCadastro, type ReciboCadastro } from '~~/shared/domain/cadastro'

export function criarEnvioCadastro(app: FirebaseApp) {
  const enviar = httpsCallable<OperacaoCadastro, ReciboCadastro>(getFunctions(app, 'southamerica-east1'), 'registrarCadastro')
  return async (operacao: OperacaoCadastro): Promise<ReciboCadastro> => ReciboCadastroSchema.parse((await enviar(OperacaoCadastroSchema.parse(operacao))).data)
}
