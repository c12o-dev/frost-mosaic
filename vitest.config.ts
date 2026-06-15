import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // pure logic は環境非依存。component test を足す increment で
    // environmentMatchGlobs に happy-dom を追加する。
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
