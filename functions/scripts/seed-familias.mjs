/** Exclusivamente emulador. Nenhum cadastro real. */
export async function seedFamilias(db, municipioId = 'municipio-teste', equipeId = 'equipe-teste', microareaId = 'micro-teste') {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Seed permitido somente no emulador')
  const base = db.doc(`tenants/${municipioId}`)
  const territorio = { municipioId, equipeId, microareaId }
  const batch = db.batch()
  batch.set(base.collection('domicilios').doc('domicilio-ficticio'), { ...territorio, id: 'domicilio-ficticio', logradouro: 'Rua Fictícia', numero: '0', bairro: 'Bairro de Teste', quantidadeComodos: 3, quantidadeMoradores: 1, abastecimentoAgua: 'REDE_ENCANADA', esgotamentoSanitario: 'REDE_COLETORA', destinoLixo: 'COLETADO', saneamentoInadequado: false, adensamentoExcessivo: false })
  batch.set(base.collection('familias').doc('familia-ficticia'), { ...territorio, id: 'familia-ficticia', domicilioId: 'domicilio-ficticio', prontuarioFamiliar: 'FICTICIO-001', responsavelNome: 'Pessoa Fictícia de Teste', responsavelId: 'individuo-ficticio', status: 'ATIVA', quantidadeMembros: 1, versaoCadastro: 0, ultimaClassificacaoRisco: 'SEM_RISCO_R0', ultimaPontuacaoRisco: 0 })
  batch.set(base.collection('individuos').doc('individuo-ficticio'), { ...territorio, id: 'individuo-ficticio', familiaId: 'familia-ficticia', nome: 'Pessoa Fictícia de Teste', dataNascimento: '1980-01-01', sexo: 'OUTRO', parentesco: 'Responsável', condicoesCronicas: { hipertenso: false, diabetico: false, acamado: false, deficienciaFisica: false, deficienciaMental: false, desnutricaoGrave: false, usoAbusivoDrogas: false } })
  await batch.commit()
}
