import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'favicon.svg'],
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'EzPDV - Sorveteria',
        short_name: 'EzPDV',
        description: 'Ponto de Venda Inteligente para Quiosques de Sorvete e Gelaterias',
        theme_color: '#ff6b8b',
        background_color: '#fcf8f5',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
})
