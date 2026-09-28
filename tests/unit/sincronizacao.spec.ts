import { describe, expect, it } from 'vitest'
import { OperacaoAvaliacaoSchema, ReciboOperacaoSchema, RegistroOperacaoSchema, AvaliacaoCanonicaSchema } from '../../shared/domain/sincronizacao'
import { calcularEstratificacaoRisco } from '../../shared/domain/risk-engine/calculadora'
import { montarDocumentoAvaliacao } from '../../shared/domain/schemas'
import { IndicadorRiscoCodigo, PerfilProfissional } from '../../shared/domain/risk-engine/types'
const exemplo = () => ({ operacaoId: '00000000-0000-4000-8000-000000000000', tenantId: 'municipio-teste', familiaId: 'familia-teste', versaoCadastroBase: 0, avaliacaoAnteriorId: null, versaoEscala: 'teste', coletadoEm: '2026-01-01T00:00:00Z', indicadores: Object.values(IndicadorRiscoCodigo).map(codigo => ({ codigo, ativo: false })) })
describe('contrato da operação de avaliação', () => {
  it('exige respostas explícitas para todos os indicadores', () => {
    expect(OperacaoAvaliacaoSchema.safeParse(exemplo()).success).toBe(true)
    expect(OperacaoAvaliacaoSchema.safeParse({ ...exemplo(), indicadores: [] }).success).toBe(false)
  })
  it('nega códigos repetidos, caminhos e autoridade enviada pelo cliente', () => {
    const data = exemplo()
    data.indicadores[0] = data.indicadores[1]!
    expect(OperacaoAvaliacaoSchema.safeParse(data).success).toBe(false)
    expect(OperacaoAvaliacaoSchema.safeParse({ ...exemplo(), tenantId: '../outro' }).success).toBe(false)
    expect(OperacaoAvaliacaoSchema.safeParse({ ...exemplo(), avaliadorId: 'outro' }).success).toBe(false)
  })
})

describe('schemas de recibos e documentos canônicos', () => {
  const confirmado = { operacaoId: exemplo().operacaoId, registradoEm: '2026-01-01T00:00:00Z', status: 'CONFIRMADA', avaliacaoId: 'avaliacao-ficticia' }
  const conflito = { operacaoId: exemplo().operacaoId, registradoEm: '2026-01-01T00:00:00Z', status: 'CONFLITO', motivo: 'CADASTRO_ALTERADO' }
  const registro = { uid: 'profissional-ficticio', municipioId: exemplo().tenantId, conteudoHash: 'a'.repeat(64) }
  it('distingue confirmação de conflito e rejeita recibos incompletos', () => {
    expect(ReciboOperacaoSchema.parse(confirmado)).toEqual(confirmado)
    expect(ReciboOperacaoSchema.parse(conflito)).toEqual(conflito)
    expect(ReciboOperacaoSchema.safeParse({ ...confirmado, avaliacaoId: undefined }).success).toBe(false)
    expect(ReciboOperacaoSchema.safeParse({ ...conflito, motivo: undefined }).success).toBe(false)
    expect(ReciboOperacaoSchema.safeParse({ ...confirmado, motivo: 'CADASTRO_ALTERADO' }).success).toBe(false)
  })
  it('preserva operação de conflito do mesmo município e ID sem duplicar respostas confirmadas', () => {
    expect(RegistroOperacaoSchema.safeParse({ ...registro, recibo: confirmado }).success).toBe(true)
    expect(RegistroOperacaoSchema.safeParse({ ...registro, recibo: conflito, operacao: exemplo() }).success).toBe(true)
    expect(RegistroOperacaoSchema.safeParse({ ...registro, recibo: conflito }).success).toBe(false)
    expect(RegistroOperacaoSchema.safeParse({ ...registro, recibo: conflito, operacao: { ...exemplo(), tenantId: 'outro' } }).success).toBe(false)
    expect(RegistroOperacaoSchema.safeParse({ ...registro, recibo: confirmado, operacao: exemplo() }).success).toBe(false)
  })
  it('exige respostas completas e preserva invariante de soma na avaliação canônica', () => {
    const operacao = exemplo()
    const resultado = calcularEstratificacaoRisco({ familiaId: operacao.familiaId, indicadores: operacao.indicadores }, {
      dataAvaliacao: operacao.coletadoEm, avaliadorId: 'profissional-ficticio', avaliadorPerfil: PerfilProfissional.ACS
    })
    const avaliacao = { ...montarDocumentoAvaliacao(resultado, {
      familiaId: operacao.familiaId, avaliadorNome: 'Profissional Fictício',
      territorio: { municipioId: operacao.tenantId, equipeId: 'equipe-ficticia', microareaId: 'microarea-ficticia' }
    }), operacaoId: operacao.operacaoId, respostas: operacao.indicadores }
    expect(AvaliacaoCanonicaSchema.parse(avaliacao)).toEqual(avaliacao)
    expect(AvaliacaoCanonicaSchema.safeParse({ ...avaliacao, pontuacaoTotal: 1 }).success).toBe(false)
    expect(AvaliacaoCanonicaSchema.safeParse({ ...avaliacao, respostas: [] }).success).toBe(false)
  })
})
