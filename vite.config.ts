import { defineConfig, type Plugin, type ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * `base` is injected by the Pages workflow, which knows the repository name and
 * therefore the sub-path the site is served from. Locally and for the
 * self-contained build it stays './', so the same output opens from a file, a
 * sub-path or a domain root without rebuilding.
 */
const base = process.env.PAGES_BASE || './'

/**
 * Emits the service worker, with the precache manifest filled in from what
 * Rollup actually produced.
 *
 * It runs after the build is written rather than during it, so the manifest is
 * a listing of real files on disk instead of a guess at the bundle's shape.
 * The version is a hash of that listing: assets are content-hashed, so any
 * change to the app changes the version, which is what retires the old cache.
 */
function serviceWorker(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'hoard-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    closeBundle() {
      const outDir = join(config.root, config.build.outDir)

      const walk = (dir: string): string[] =>
        readdirSync(dir).flatMap((entry) => {
          const full = join(dir, entry)
          return statSync(full).isDirectory() ? walk(full) : [full]
        })

      const files = walk(outDir)
        .map((f) => relative(outDir, f).split(sep).join('/'))
        // sw.js is the output of this plugin; a previous build's copy must not
        // end up precaching itself.
        .filter((f) => f !== 'sw.js')
        .sort()

      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12)
      const template = readFileSync(join(config.root, 'scripts/sw-template.js'), 'utf8')

      const source = template
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(files.map((f) => `./${f}`), null, 2))

      writeFileSync(join(outDir, 'sw.js'), source)
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), serviceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { outDir: 'dist', target: 'es2022' },
})
