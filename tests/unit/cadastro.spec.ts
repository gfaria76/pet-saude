import { describe, expect, it } from 'vitest'
import { OperacaoCadastroSchema, DomicilioCadastroSchema, ResponsavelCadastroSchema } from '../../shared/domain/cadastro'
describe('contratos cadastrais', () => {
  it('não permite injetar clínica ou território na atualização cadastral', () => {
    const op = { tipo: 'ATUALIZAR', operacaoId: crypto.randomUUID(), tenantId: 'municipio-teste', familiaId: 'familia-teste', versaoCadastroBase: 0, prontuarioFamiliar: 'TESTE', status: 'ATIVA' }
    expect(OperacaoCadastroSchema.safeParse(op).success).toBe(true)
    expect(OperacaoCadastroSchema.safeParse({ ...op, ultimaPontuacaoRisco: 12 }).success).toBe(false)
    expect(OperacaoCadastroSchema.safeParse({ ...op, equipeId: 'outra' }).success).toBe(false)
  })
  it('não presume condições negativas para responsável', () => {
    expect(ResponsavelCadastroSchema.safeParse({ nome: 'Pessoa Fictícia', dataNascimento: '2000-01-01', sexo: 'OUTRO', parentesco: 'Responsável' }).success).toBe(false)
  })
  it('rejeita indicadores de adensamento incompatíveis com contagens', () => {
    expect(DomicilioCadastroSchema.safeParse({ logradouro: 'Rua Fictícia', numero: '1', bairro: 'Bairro Fictício', quantidadeComodos: 1, quantidadeMoradores: 2, abastecimentoAgua: 'OUTRO', esgotamentoSanitario: 'OUTRO', destinoLixo: 'COLETADO', saneamentoInadequado: false, adensamentoExcessivo: false }).success).toBe(false)
  })
})
