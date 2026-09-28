module.exports = {
  root: true,
  env: { es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module'
  },
  ignorePatterns: ['/lib/**/*', '/generated/**/*'],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'quotes': ['error', 'single'],
    'semi': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'arrow-parens': ['error', 'as-needed'],
    // TypeScript signatures carry parameter/return contracts; comments document intent.
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off',
    // tsc --noEmit resolves shared TypeScript and SDK export maps during every build.
    'import/no-unresolved': 'off',
    // Domain schemas and SDK calls need readable signatures; formatter targets 120.
    'max-len': ['error', { code: 140, ignoreUrls: true }],
    'indent': ['error', 2]
  }
}
