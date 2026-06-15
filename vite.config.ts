import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// 静的サイトとして Cloudflare Pages に置く。base を相対にしてサブパス耐性を持たせる。
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // アプリシェルだけを precache。ユーザー画像はそもそも fetch しない（メモリ内処理）。
      workbox: {
        globPatterns: ['**/*.{html,css,js,webp,png,svg,ico,woff2}'],
        // 念のため: 実行時に外部へ取りに行かない（完全オフライン・端末内完結）
        navigateFallback: 'index.html',
      },
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png'],
      manifest: {
        name: 'Frost — 氷霜ガラス・モザイク',
        short_name: 'Frost',
        description: '画像の一部を指でなぞってモザイク/氷霜ガラスで隠す。全処理が端末内で完結。',
        lang: 'ja',
        start_url: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0a0b0d',
        background_color: '#0a0b0d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
