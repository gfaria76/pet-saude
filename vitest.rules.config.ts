import { defineConfig } from 'vitest/config'

// Testes das regras do Firestore — exigem o Emulator (script `pnpm test:rules`).
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.spec.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false
  }
})
