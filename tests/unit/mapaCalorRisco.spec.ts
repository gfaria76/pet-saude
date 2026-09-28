import { describe, it, expect } from 'vitest'
import {
  calcularEstratificacaoRisco,
  FaixaRisco,
  IndicadorRiscoCodigo,
  PerfilProfissional
} from '../../shared/domain/risk-engine'
import { montarDocumentoAvaliacao, type AvaliacaoRiscoDoc, type FamiliaDoc } from '../../shared/domain/schemas'
import {
  agregarRiscoPorMicroarea,
  corIntensidadeIndicador,
  faixaMediaTerritorio,
  type FamiliaComUltimaAvaliacao
} from '../../app/utils/mapaCalorRisco'

// Dados 100% sintéticos.
const CONTEXTO = {
  dataAvaliacao: '2026-09-26T10:00:00.000Z',
  avaliadorId: 'uid-acs-ficticio',
  avaliadorPerfil: PerfilProfissional.ACS
}

function familiaFicticia(id: string, microareaId: string, municipioId = 'coxim'): FamiliaDoc {
  return {
    id,
    prontuarioFamiliar: `PR-${id}`,
    domicilioId: `dom-${id}`,
    municipioId,
    equipeId: 'ESF-01',
    microareaId,
    responsavelNome: 'Responsável Fictício',
    responsavelId: `ind-${id}`,
    status: 'ATIVA',
    quantidadeMembros: 3,
    ultimaClassificacaoRisco: FaixaRisco.SEM_RISCO_R0,
    ultimaPontuacaoRisco: 0
  }
}

function avaliacaoFicticia(familiaId: string, microareaId: string, indicadores: IndicadorRiscoCodigo[]): AvaliacaoRiscoDoc {
  const resultado = calcularEstratificacaoRisco(
    { familiaId, indicadores: indicadores.map(codigo => ({ codigo, ativo: true })) },
    CONTEXTO
  )
  return montarDocumentoAvaliacao(resultado, {
    familiaId,
    avaliadorNome: 'ACS Fictício',
    territorio: { municipioId: 'coxim', equipeId: 'ESF-01', microareaId }
  })
}

describe('agregarRiscoPorMicroarea', () => {
  it('lista vazia: nenhuma microárea', () => {
    expect(agregarRiscoPorMicroarea([])).toEqual([])
  })

  it('agrupa por microárea e calcula percentual por indicador', () => {
    const entradas: FamiliaComUltimaAvaliacao[] = [
      {
        familia: familiaFicticia('fam-1', 'MA-01'),
        ultimaAvaliacao: avaliacaoFicticia('fam-1', 'MA-01', [IndicadorRiscoCodigo.IND_HIPERTENSAO])
      },
      { familia: familiaFicticia('fam-2', 'MA-01'), ultimaAvaliacao: null }
    ]

    const [agregado] = agregarRiscoPorMicroarea(entradas)
    expect(agregado!.microareaId).toBe('MA-01')
    expect(agregado!.totalFamilias).toBe(2)
    expect(agregado!.porIndicador[IndicadorRiscoCodigo.IND_HIPERTENSAO]).toEqual({ quantidade: 1, percentual: 50 })
    expect(agregado!.porIndicador[IndicadorRiscoCodigo.IND_DIABETES]).toEqual({ quantidade: 0, percentual: 0 })
  })

  it('não conta o mesmo indicador duas vezes na mesma família (dois membros afetados)', () => {
    const entradas: FamiliaComUltimaAvaliacao[] = [
      {
        familia: familiaFicticia('fam-1', 'MA-02'),
        ultimaAvaliacao: avaliacaoFicticia('fam-1', 'MA-02', [
          IndicadorRiscoCodigo.IND_HIPERTENSAO,
          IndicadorRiscoCodigo.IND_HIPERTENSAO
        ])
      }
    ]

    const [agregado] = agregarRiscoPorMicroarea(entradas)
    expect(agregado!.porIndicador[IndicadorRiscoCodigo.IND_HIPERTENSAO].quantidade).toBe(1)
  })

  it('isola microáreas diferentes', () => {
    const entradas: FamiliaComUltimaAvaliacao[] = [
      {
        familia: familiaFicticia('fam-1', 'MA-01'),
        ultimaAvaliacao: avaliacaoFicticia('fam-1', 'MA-01', [IndicadorRiscoCodigo.IND_DIABETES])
      },
      {
        familia: familiaFicticia('fam-2', 'MA-02', 'corumba'),
        ultimaAvaliacao: avaliacaoFicticia('fam-2', 'MA-02', [IndicadorRiscoCodigo.IND_ACAMADO])
      }
    ]

    const agregados = agregarRiscoPorMicroarea(entradas)
    expect(agregados).toHaveLength(2)
    const ma01 = agregados.find(a => a.microareaId === 'MA-01')!
    const ma02 = agregados.find(a => a.microareaId === 'MA-02')!
    expect(ma01.porIndicador[IndicadorRiscoCodigo.IND_ACAMADO].quantidade).toBe(0)
    expect(ma02.porIndicador[IndicadorRiscoCodigo.IND_ACAMADO].quantidade).toBe(1)
    expect(ma02.municipioId).toBe('corumba')
  })

  it('pontuação média considera famílias sem avaliação como zero', () => {
    const entradas: FamiliaComUltimaAvaliacao[] = [
      {
        familia: familiaFicticia('fam-1', 'MA-01'),
        ultimaAvaliacao: avaliacaoFicticia('fam-1', 'MA-01', [
          IndicadorRiscoCodigo.IND_ACAMADO, // peso 3
          IndicadorRiscoCodigo.IND_DROGADICAO // peso 2
        ])
      },
      { familia: familiaFicticia('fam-2', 'MA-01'), ultimaAvaliacao: null }
    ]

    const [agregado] = agregarRiscoPorMicroarea(entradas)
    expect(agregado!.pontuacaoMediaRisco).toBe(2.5) // (5 + 0) / 2
  })
})

describe('corIntensidadeIndicador', () => {
  it('0% recebe a cor mais clara', () => {
    expect(corIntensidadeIndicador(0)).toBe('#E0F2FE')
  })

  it('100% recebe a cor mais escura', () => {
    expect(corIntensidadeIndicador(100)).toBe('#0E7490')
  })

  it('é monotonicamente mais escura conforme o percentual sobe (degraus distintos)', () => {
    const cores = [0, 25, 50, 75, 100].map(corIntensidadeIndicador)
    expect(new Set(cores).size).toBe(5)
  })
})

describe('faixaMediaTerritorio', () => {
  it('reaproveita os mesmos cortes do motor de risco', () => {
    expect(faixaMediaTerritorio(0)).toBe(FaixaRisco.SEM_RISCO_R0)
    expect(faixaMediaTerritorio(1)).toBe(FaixaRisco.RISCO_MENOR_R1)
    expect(faixaMediaTerritorio(5)).toBe(FaixaRisco.RISCO_MEDIO_R2)
    expect(faixaMediaTerritorio(7)).toBe(FaixaRisco.RISCO_MAIOR_R3)
  })
})
