<script setup lang="ts">
import { computed, ref } from 'vue'
import { IndicadorRiscoCodigo, METADADOS_INDICADORES } from '~~/shared/domain/risk-engine'
import type { MicroareaDoc } from '~~/shared/domain/schemas'
import { ICONES } from '~/utils/icones'
import { estiloFaixa } from '~/utils/estiloFaixaRisco'
import { corIntensidadeIndicador, faixaMediaTerritorio, type AgregacaoMicroarea } from '~/utils/mapaCalorRisco'

const props = defineProps<{
  agregacoes: AgregacaoMicroarea[]
  microareas: MicroareaDoc[]
}>()

type ModoMapa = 'GERAL' | IndicadorRiscoCodigo

const modo = ref<ModoMapa>('GERAL')

const opcoesModo = computed(() => [
  { label: 'Risco geral (pontuação média da microárea)', value: 'GERAL' as ModoMapa },
  ...Object.values(IndicadorRiscoCodigo).map(codigo => ({
    label: METADADOS_INDICADORES[codigo].descricao,
    value: codigo as ModoMapa
  }))
])

interface PontoMapa {
  readonly microarea: MicroareaDoc
  readonly agregacao: AgregacaoMicroarea
  readonly cor: string
  readonly raioMetros: number
  readonly valorRotulo: string
  readonly descricaoDetalhe: string
}

/**
 * Um ponto por microárea (nunca por família): agrega dados já calculados em
 * `useFamilias.ts` (agregarRiscoPorMicroarea) e escolhe cor/raio conforme o
 * modo selecionado. Microáreas sem coordenadas ou sem famílias avaliadas
 * ficam de fora do mapa, mas continuam auditáveis na tabela abaixo dele.
 */
const pontosMapa = computed<PontoMapa[]>(() => {
  const pontos: PontoMapa[] = []
  for (const microarea of props.microareas) {
    if (microarea.latitude === undefined || microarea.longitude === undefined) continue
    const agregacao = props.agregacoes.find(a => a.microareaId === microarea.id)
    if (!agregacao || agregacao.totalFamilias === 0) continue

    const raioMetros = 250 + agregacao.totalFamilias * 150

    if (modo.value === 'GERAL') {
      const faixa = faixaMediaTerritorio(agregacao.pontuacaoMediaRisco)
      pontos.push({
        microarea,
        agregacao,
        cor: estiloFaixa(faixa).corHex,
        raioMetros,
        valorRotulo: `${agregacao.pontuacaoMediaRisco.toFixed(1)} pts`,
        descricaoDetalhe: `${estiloFaixa(faixa).rotulo} (média da microárea)`
      })
    } else {
      const intensidade = agregacao.porIndicador[modo.value]
      pontos.push({
        microarea,
        agregacao,
        cor: corIntensidadeIndicador(intensidade.percentual),
        raioMetros,
        valorRotulo: `${intensidade.percentual}%`,
        descricaoDetalhe: `${intensidade.quantidade} de ${agregacao.totalFamilias} famílias com esta condição`
      })
    }
  }
  return pontos
})

const centro = computed<[number, number]>(() => {
  if (pontosMapa.value.length === 0) return [-19.5, -55.0] // centro aproximado de Mato Grosso do Sul
  const soma = pontosMapa.value.reduce(
    (acc, p) => [acc[0] + p.microarea.latitude!, acc[1] + p.microarea.longitude!] as [number, number],
    [0, 0] as [number, number]
  )
  return [soma[0] / pontosMapa.value.length, soma[1] / pontosMapa.value.length]
})

const zoom = computed(() => {
  if (pontosMapa.value.length === 0) return 6
  const municipios = new Set(pontosMapa.value.map(p => p.microarea.municipioId))
  return municipios.size > 1 ? 7 : 12
})
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-bold text-highlighted flex items-center gap-2">
          <Icon :name="ICONES.mapa" class="w-5 h-5 text-primary" aria-hidden="true" />
          <span>Mapa de Calor Territorial</span>
        </h3>
        <p class="text-xs text-muted mt-0.5">
          Prevalência agregada por microárea — nunca localiza uma família individual (LGPD).
        </p>
      </div>

      <UFormField label="Condição exibida" class="sm:w-72">
        <USelect v-model="modo" :items="opcoesModo" value-key="value" size="sm" class="w-full font-semibold" />
      </UFormField>
    </div>

    <div
      v-if="pontosMapa.length === 0"
      class="p-8 text-center text-muted bg-default rounded-2xl border border-default space-y-2"
    >
      <Icon :name="ICONES.vazio" class="w-7 h-7 text-dimmed mx-auto" aria-hidden="true" />
      <p class="text-xs font-semibold text-toned">Nenhuma microárea com avaliações e coordenadas para exibir no mapa.</p>
    </div>

    <template v-else>
      <ClientOnly>
        <LMap
          :center="centro"
          :zoom="zoom"
          :use-global-leaflet="false"
          style="height: 320px; border-radius: 1rem; overflow: hidden;"
          class="border border-default"
        >
          <LTileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            layer-type="base"
            name="OpenStreetMap"
          />
          <LCircle
            v-for="ponto in pontosMapa"
            :key="ponto.microarea.id"
            :lat-lng="[ponto.microarea.latitude!, ponto.microarea.longitude!]"
            :radius="ponto.raioMetros"
            color="#0E7490"
            :fill-color="ponto.cor"
            :fill-opacity="0.6"
            :weight="2"
          >
            <LTooltip :options="{ permanent: true, direction: 'center', className: 'font-bold text-xs' }">
              {{ ponto.valorRotulo }}
            </LTooltip>
            <LPopup>
              <div class="text-xs space-y-1">
                <p class="font-bold">MA-{{ ponto.microarea.numero }} — {{ ponto.microarea.descricao ?? ponto.microarea.id }}</p>
                <p>{{ ponto.agregacao.totalFamilias }} famílias avaliadas</p>
                <p>{{ ponto.descricaoDetalhe }}</p>
              </div>
            </LPopup>
          </LCircle>
        </LMap>
        <template #fallback>
          <div class="h-80 rounded-2xl border border-default bg-elevated animate-pulse" />
        </template>
      </ClientOnly>

      <!-- Equivalente textual: acessibilidade (leitores de tela não interpretam o mapa) -->
      <UCard :ui="{ root: 'rounded-2xl border border-default bg-default overflow-hidden', body: 'p-0 sm:p-0' }">
        <table class="w-full text-xs">
          <caption class="sr-only">Prevalência por microárea da condição selecionada no mapa de calor</caption>
          <thead class="bg-elevated text-muted uppercase text-[10px] tracking-wider">
            <tr>
              <th class="text-left px-3 py-2">Microárea</th>
              <th class="text-left px-3 py-2">Famílias</th>
              <th class="text-left px-3 py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ponto in pontosMapa" :key="`linha-${ponto.microarea.id}`" class="border-t border-default">
              <td class="px-3 py-2 font-semibold text-toned">
                MA-{{ ponto.microarea.numero }} — {{ ponto.microarea.descricao ?? ponto.microarea.id }}
              </td>
              <td class="px-3 py-2 text-muted">{{ ponto.agregacao.totalFamilias }}</td>
              <td class="px-3 py-2 font-bold" :style="{ color: ponto.cor }">{{ ponto.valorRotulo }}</td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </template>

    <p v-if="modo === 'GERAL'" class="text-[11px] text-dimmed">
      Pesos e faixas de corte estão pendentes de validação (context/business_rules.md) — leitura indicativa do
      território, não uma classificação clínica de família.
    </p>
  </div>
</template>
