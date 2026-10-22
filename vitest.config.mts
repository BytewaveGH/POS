import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  // tsconfig uses "jsx": "preserve" for Next; tests need it compiled.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
