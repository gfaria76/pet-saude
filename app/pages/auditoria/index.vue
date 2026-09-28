<script setup lang="ts">
import { ref } from 'vue'
import { PerfilProfissional } from '~~/shared/domain/risk-engine'
import type { LogAuditoriaDoc } from '~~/shared/domain/schemas'
import { ICONES } from '~/utils/icones'

// Registros de auditoria sintéticos em conformidade com LogAuditoriaSchema
const logsSinteticos = ref<LogAuditoriaDoc[]>([
  {
    usuarioId: 'uid-demo-acs',
    perfil: PerfilProfissional.ACS,
    municipioId: 'coxim',
    acao: 'CRIAR_AVALIACAO_RISCO',
    recursoTipo: 'AVALIACAO_RISCO',
    recursoId: 'aval-demo-0002',
    dataHora: '2026-09-18T14:30:00.000Z',
    justificativa: 'Reavaliação periódica de rotina durante visita domiciliar'
  },
  {
    usuarioId: 'uid-demo-acs',
    perfil: PerfilProfissional.ACS,
    municipioId: 'coxim',
    acao: 'CONSULTAR_FAMILIA',
    recursoTipo: 'FAMILIA',
    recursoId: 'fam-coxim-001',
    dataHora: '2026-09-18T14:28:10.000Z'
  },
  {
    usuarioId: 'uid-demo-enfermeiro',
    perfil: PerfilProfissional.ENFERMEIRO,
    municipioId: 'corumba',
    acao: 'CRIAR_AVALIACAO_RISCO',
    recursoTipo: 'AVALIACAO_RISCO',
    recursoId: 'aval-demo-0003',
    dataHora: '2026-09-10T11:00:00.000Z',
    justificativa: 'Consulta de enfermagem na UBS para estratificação de risco crônico'
  },
  {
    usuarioId: 'uid-demo-coordenador',
    perfil: PerfilProfissional.COORDENADOR_APS,
    municipioId: 'coxim',
    acao: 'ATUALIZAR_MICROAREA',
    recursoTipo: 'MICROAREA',
    recursoId: 'MA-01',
    dataHora: '2026-09-01T08:00:00.000Z',
    justificativa: 'Ajuste de delimitação territorial para equipe ESF-PANTANAL-01'
  }
])

const colunasAuditoria = [
  { accessorKey: 'dataHora', header: 'Data / Hora' },
  { accessorKey: 'usuarioId', header: 'Usuário (ID / Perfil)' },
  { accessorKey: 'municipioId', header: 'Município' },
  { accessorKey: 'acao', header: 'Ação Realizada' },
  { id: 'recurso', header: 'Recurso Afetado (ID Anônimo)' },
  { accessorKey: 'justificativa', header: 'Justificativa' }
]

function formatarData(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(d)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-highlighted flex items-center gap-2.5">
          <Icon :name="ICONES.lgpd" class="w-8 h-8 text-primary" aria-hidden="true" />
          <span>Segurança, Auditoria e LGPD</span>
        </h1>
        <p class="text-sm text-muted mt-1">
          Eventos sintéticos para demonstração da trilha de auditoria.
        </p>
      </div>

      <div class="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3.5 py-2 rounded-xl">
        <Icon :name="ICONES.registroConfirmado" class="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>Ambiente demonstrativo · dados sintéticos</span>
      </div>
    </div>

    <!-- Princípios e Regras Aplicadas no Sistema com UCard -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
      <UCard
        class="border border-default shadow-xs"
        :ui="{
          root: 'rounded-2xl bg-default',
          body: 'p-5 space-y-2'
        }"
      >
        <div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
          1
        </div>
        <h2 class="font-bold text-highlighted text-sm">Minimização de Dados</h2>
        <p class="text-muted leading-relaxed">
          O sistema coleta apenas o estritamente necessário para identificação familiar e estratificação de risco. CPF e CNS são campos opcionais.
        </p>
      </UCard>

      <UCard
        class="border border-default shadow-xs"
        :ui="{
          root: 'rounded-2xl bg-default',
          body: 'p-5 space-y-2'
        }"
      >
        <div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
          2
        </div>
        <h2 class="font-bold text-highlighted text-sm">RBAC Territorial Rigoroso</h2>
        <p class="text-muted leading-relaxed">
          ACS acessam apenas suas microáreas. Profissionais da eSF acessam apenas sua equipe. Administradores do sistema não têm acesso a dados clínicos de saúde.
        </p>
      </UCard>

      <UCard
        class="border border-default shadow-xs"
        :ui="{
          root: 'rounded-2xl bg-default',
          body: 'p-5 space-y-2'
        }"
      >
        <div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
          3
        </div>
        <h2 class="font-bold text-highlighted text-sm">Logs Anonimizados</h2>
        <p class="text-muted leading-relaxed">
          A auditoria nunca registra nomes de pacientes, diagnósticos clínicos, CPF ou senhas. Apenas IDs anônimos, ação, perfil profissional e timestamp.
        </p>
      </UCard>
    </div>

    <!-- Tabela de Logs de Auditoria com UTable Nuxt UI v4 -->
    <UCard
      class="border border-default shadow-xs"
      :ui="{
        root: 'rounded-2xl bg-default overflow-hidden',
        body: 'p-0 sm:p-0'
      }"
    >
      <div class="p-5 border-b border-default flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-highlighted">
            Trilha de Auditoria do Sistema (Append-Only)
          </h2>
          <p class="text-xs text-muted mt-0.5">
            Registro imutável de operações executadas pelos profissionais.
          </p>
        </div>
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ logsSinteticos.length }} registros
        </UBadge>
      </div>

      <UTable :columns="colunasAuditoria" :data="logsSinteticos">
        <template #dataHora-cell="{ row }">
          <span class="text-muted font-mono text-[11px]">
            {{ formatarData(row.original.dataHora) }}
          </span>
        </template>

        <template #usuarioId-cell="{ row }">
          <div>
            <span class="font-bold text-default text-xs">{{ row.original.usuarioId }}</span>
            <span class="block text-[11px] text-blue-800 font-semibold">{{ row.original.perfil }}</span>
          </div>
        </template>

        <template #municipioId-cell="{ row }">
          <span class="capitalize text-toned text-xs">
            {{ row.original.municipioId }}
          </span>
        </template>

        <template #acao-cell="{ row }">
          <UBadge color="neutral" variant="subtle" size="xs" class="font-mono">
            {{ row.original.acao }}
          </UBadge>
        </template>

        <template #recurso-cell="{ row }">
          <span class="font-mono text-[11px] text-muted">
            {{ row.original.recursoTipo }}: {{ row.original.recursoId }}
          </span>
        </template>

        <template #justificativa-cell="{ row }">
          <span class="text-muted text-xs max-w-xs truncate block">
            {{ row.original.justificativa || '—' }}
          </span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
