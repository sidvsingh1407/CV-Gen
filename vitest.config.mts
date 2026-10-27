import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules', 'e2e', '.next'],
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
})
