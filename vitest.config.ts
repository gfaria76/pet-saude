import { defineConfig } from 'vitest/config'

// Testes unitários puros (motor de domínio e schemas) — rodam sem emulador.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts']
  }
})
