/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base: the build runs on any static host and in any subfolder
// (e.g. GitHub Pages under /Kleider-App/).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Kleider – Outfits fürs Wetter',
        short_name: 'Kleider',
        description: 'Kleider verwalten und passende Outfits zum Wetter vorschlagen lassen.',
        lang: 'de-CH',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f2ec',
        theme_color: '#f5f2ec',
        categories: ['lifestyle', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Outfit des Tages', short_name: 'Heute', url: './#/' },
          { name: 'Kleidungsstück hinzufügen', short_name: 'Neu', url: './#/kleider' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'wetter',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 10, maxAgeSeconds: 2 * 24 * 3600 },
            },
          },
          {
            urlPattern: /^https:\/\/geocoding-api\.open-meteo\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'orte', expiration: { maxEntries: 30, maxAgeSeconds: 30 * 24 * 3600 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
