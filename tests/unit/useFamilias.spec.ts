import { describe, it, expect } from 'vitest'
import { FaixaRisco, IndicadorRiscoCodigo, calcularEstratificacaoRisco } from '../../shared/domain/risk-engine'
import { useFamilias } from '../../app/composables/useFamilias'

// Fluxo da tela com os dados sintéticos em memória.
describe('useFamilias — fluxo de reavaliação', () => {
  const familiaCX1042 = (estado: ReturnType<typeof useFamilias>) =>
    estado.familias.value.find(f => f.prontuarioFamiliar === 'CX-1042')!

  it('resumo de cada família é derivado da última avaliação do histórico', () => {
    const estado = useFamilias()
    const familia = familiaCX1042(estado)
    estado.abrirDrawerExplicativo(familia)
    expect(familia.ultimaAvaliacaoId).toBe(estado.avaliacaoSelecionada.value?.id)
    expect(familia.ultimaPontuacaoRisco).toBe(estado.avaliacaoSelecionada.value?.pontuacaoTotal)
    expect(estado.totalAvaliacoesSelecionada.value).toBe(2)
  })

  it('o formulário recebe a avaliação anterior mesmo abrindo a partir do drawer (bug do delta)', () => {
    const estado = useFamilias()
    const familia = familiaCX1042(estado)
    estado.abrirDrawerExplicativo(familia)
    estado.iniciarNovaAvaliacao(familia)

    expect(estado.drawerAberto.value).toBe(false)
    expect(estado.avaliacaoAnteriorParaForm.value?.pontuacao).toBe(familia.ultimaPontuacaoRisco)
    expect(estado.contextoFormulario.value?.avaliadorId).toBeTruthy()
  })

  it('salvar acrescenta ao histórico (não sobrescreve) e expõe o delta', () => {
    const estado = useFamilias()
    const familia = familiaCX1042(estado)
    estado.iniciarNovaAvaliacao(familia)

    // Família sem nenhuma condição ⇒ melhoria em relação à avaliação anterior
    const resultado = calcularEstratificacaoRisco(
      { familiaId: familia.id, indicadores: [], avaliacaoAnterior: estado.avaliacaoAnteriorParaForm.value },
      estado.contextoFormulario.value!
    )
    estado.salvarNovaAvaliacao(resultado)

    expect(estado.totalAvaliacoesSelecionada.value).toBe(3)
    expect(estado.avaliacaoSelecionada.value?.comparativoAvaliacaoAnterior?.evolucaoRisco).toBe('MELHORIA')
    expect(familiaCX1042(estado).ultimaClassificacaoRisco).toBe(FaixaRisco.SEM_RISCO_R0)
    expect(estado.avaliacaoSelecionada.value?.avaliadorNome).toContain('Fictício')
  })

  it('contagem por faixa acompanha o filtro de município', () => {
    const estado = useFamilias()
    estado.filtroMunicipio.value = 'corumba'
    const total = Object.values(estado.contagemRisco.value).reduce((a, b) => a + b, 0)
    expect(total).toBe(estado.totalFamiliasMunicipio.value)
    expect(estado.familiasFiltradas.value.every(f => f.municipioId === 'corumba')).toBe(true)
  })

  it('nenhum fator guarda nome de indivíduo', () => {
    const estado = useFamilias()
    estado.abrirDrawerExplicativo(familiaCX1042(estado))
    for (const fator of estado.avaliacaoSelecionada.value?.fatoresDeterminantes ?? []) {
      expect(fator).not.toHaveProperty('individuoNome')
      expect(Object.values(IndicadorRiscoCodigo)).toContain(fator.indicadorCodigo)
    }
  })
})
