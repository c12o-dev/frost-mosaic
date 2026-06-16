import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const page = (name: string) => fileURLToPath(new URL(`./${name}`, import.meta.url))

// 静的サイトとして Cloudflare Pages に置く。base を相対にしてサブパス耐性を持たせる。
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      // マルチページ: index=LP / app=ツール本体 / 読み物ページ
      input: {
        main: page('index.html'),
        app: page('app.html'),
        privacy: page('privacy.html'),
        faq: page('faq.html'),
        howto: page('howto.html'),
      },
    },
  },
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
        // インストール起動はツール本体を直接開く（LP を経由しない）
        start_url: './app.html',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#070a0e',
        background_color: '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
