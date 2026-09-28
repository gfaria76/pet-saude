import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Testes das regras do Firestore — exigem o Emulator (script `pnpm test:rules`).
export default defineConfig({
  resolve: { alias: { '~~': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    include: ['tests/rules/**/*.spec.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false
  }
})
