import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { criarAutenticacao } from '~/services/autenticacao'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const configurado = Boolean(config.firebaseApiKey && config.firebaseAuthDomain && config.firebaseProjectId && config.firebaseAppId)
  const app = configurado ? getApps()[0] ?? initializeApp({
    apiKey: config.firebaseApiKey,
    authDomain: config.firebaseAuthDomain,
    projectId: config.firebaseProjectId,
    storageBucket: config.firebaseStorageBucket,
    messagingSenderId: config.firebaseMessagingSenderId,
    appId: config.firebaseAppId
  }) : null
  const auth = app ? getAuth(app) : null
  const firestore = app ? getFirestore(app) : null
  if (app && auth && firestore && config.firebaseEmulators) {
    if (!config.firebaseProjectId.startsWith('demo-') || !['localhost', '127.0.0.1'].includes(location.hostname)) {
      throw new Error('Emuladores exigem projeto demo e origem local.')
    }
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
      connectFunctionsEmulator(getFunctions(app, 'southamerica-east1'), '127.0.0.1', 5001)
    }
  }
  const autenticacao = criarAutenticacao(auth)
  if (import.meta.hot) import.meta.hot.dispose(autenticacao.destruir)

  return {
    provide: {
      firebaseApp: app,
      firestore,
      auth,
      autenticacao
    }
  }
})
