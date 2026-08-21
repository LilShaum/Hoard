import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * `base` is injected by the Pages workflow, which knows the repository name and
 * therefore the sub-path the site is served from. Locally and for the
 * self-contained build it stays './', so the same output opens from a file, a
 * sub-path or a domain root without rebuilding.
 */
const base = process.env.PAGES_BASE || './'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { outDir: 'dist', target: 'es2022' },
})
