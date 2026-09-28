import { build } from 'esbuild'
await build({ entryPoints: ['src/index.ts'], outfile: 'lib/index.js', bundle: true, platform: 'node', target: 'node24', format: 'cjs', packages: 'external', sourcemap: true })
