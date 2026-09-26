import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Testes unitários (motor, schemas e composables sem DOM) — rodam sem emulador.
export default defineConfig({
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('./', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  },
  test: {
    include: ['tests/unit/**/*.spec.ts']
  }
})
