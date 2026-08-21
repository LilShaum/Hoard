import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath, URL } from 'node:url'

/** Inlines the whole app into one self-contained HTML file. */
export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist-single',
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    reportCompressedSize: false,
  },
})
