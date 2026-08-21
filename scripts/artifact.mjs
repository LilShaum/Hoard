/**
 * Turns the single-file build into a body fragment for publishing.
 *
 * The Artifact host supplies its own <!doctype>/<html>/<head>/<body>, so the
 * page content has to arrive without a second document skeleton wrapped around
 * it. Everything is already inlined by vite-plugin-singlefile, so this is a
 * matter of unwrapping, not rebuilding — with <title> hoisted to the top, since
 * only the first 8KB of the file is scanned for it.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync('dist-single/index.html', 'utf8')

const pick = (tag) => {
  const m = src.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return m ? m[1] : ''
}

const head = pick('head')
const body = pick('body')
if (!body.includes('id="root"')) throw new Error('no #root in the built body — build first')

const title = (head.match(/<title>([\s\S]*?)<\/title>/i) ?? [, 'Hoard'])[1]
// Keep the meta and link tags (theme-color, icon, manifest) but drop the
// duplicate title; it is re-emitted first.
const meta = head
  .replace(/<title>[\s\S]*?<\/title>/i, '')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => /^<(meta|link)\b/i.test(l))
  .join('\n')

const styles = [...head.matchAll(/<style[\s\S]*?<\/style>/gi)].map((m) => m[0]).join('\n')
const headScripts = [...head.matchAll(/<script[\s\S]*?<\/script>/gi)].map((m) => m[0]).join('\n')

const out = `<title>${title}</title>
${meta}
${styles}
${headScripts}
${body.trim()}
`

writeFileSync('dist-single/artifact.html', out)
console.log(`artifact.html  ${(out.length / 1024).toFixed(0)} KB`)
