// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  vite: { ssr: { noExternal: [/shared\/domain\//] } },
  modules: ['@nuxt/ui', 'nuxt-qrcode', 'nuxt-echarts', '@nuxtjs/leaflet', '@vite-pwa/nuxt'],
  nitro: { prerender: { routes: ['/'] } },
  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'PET-Saúde — Atenção Primária',
      short_name: 'PET-Saúde',
      lang: 'pt-BR',
      start_url: '/visitas',
      display: 'standalone',
      theme_color: '#0E7490',
      background_color: '#F8FAFC',
      icons: [{ src: '/icone-app.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
    },
    workbox: {
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//, /^\/__\//],
      globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      // Apenas shell e assets do build; nenhuma resposta clínica/autenticação.
      runtimeCaching: [],
      cleanupOutdatedCaches: true
    },
    client: { installPrompt: true }
  },
  css: ['~/assets/css/main.css'],
  echarts: {
    renderer: ['canvas'],
    charts: ['BarChart', 'PieChart', 'LineChart'],
    components: ['DatasetComponent', 'GridComponent', 'TooltipComponent', 'LegendComponent', 'TitleComponent']
  },
  // Padrão de ícones: Health Icons (context/ui_guidelines.md §4). Os ícones usados
  // vão no bundle do cliente para funcionar sem internet em visita domiciliar.
  // Os mapas ficam em app/utils/*.ts, por isso o scan inclui .ts além de .vue.
  icon: {
    clientBundle: {
      scan: {
        globInclude: ['app/**/*.{vue,ts}']
      }
    }
  },
  runtimeConfig: {
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
      firebaseEmulators: process.env.NUXT_PUBLIC_FIREBASE_EMULATORS === 'true'
    }
  }
})
