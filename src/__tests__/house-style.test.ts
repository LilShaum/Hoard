import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * House-style guards.
 *
 * These encode three explicit design decisions so they survive future edits:
 * no emoji anywhere in the interface, no gradients, and no purple. Each was a
 * deliberate call, and each is the kind of thing that quietly creeps back in
 * one convenient character at a time.
 */

function sourceFiles(dir = 'src', out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sourceFiles(path, out)
    else if (/\.(ts|tsx|css)$/.test(name) && !path.includes('__tests__')) out.push(path)
  }
  return out
}

const FILES = sourceFiles()

// Pictographic ranges only: this must not trip on ×, ÷, arrows or dashes.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u

/**
 * The single legitimate home for emoji: the v1 to v2 migration, which reads
 * emoji out of old saved data and maps them onto drawn glyphs. Those characters
 * are input, not interface — deleting them would strand every vault created
 * before the redesign.
 */
const EMOJI_ALLOWED = 'src/store/persist.ts'

describe('no emoji', () => {
  it('finds no emoji anywhere it would reach the screen', () => {
    const offenders = FILES
      .filter((f) => f !== EMOJI_ALLOWED)
      .map((f) => ({ f, lines: readFileSync(f, 'utf8').split('\n') }))
      .flatMap(({ f, lines }) =>
        lines.flatMap((line, i) => (EMOJI.test(line) ? [`${f}:${i + 1} ${line.trim().slice(0, 70)}`] : [])))
    expect(offenders).toEqual([])
  })

  it('confines the migration map to reading old data, never rendering it', () => {
    const persist = readFileSync(EMOJI_ALLOWED, 'utf8')
    // Emoji may only appear as keys of the lookup, never in JSX or a string
    // that could be displayed.
    const emojiLines = persist.split('\n').filter((l) => EMOJI.test(l))
    expect(emojiLines.length).toBeGreaterThan(0)
    for (const line of emojiLines) expect(line).toMatch(/^\s*'.+':\s*'[a-z]+',/)
  })

  it('has at least one file to check, so the guard cannot pass vacuously', () => {
    expect(FILES.length).toBeGreaterThan(20)
  })
})

describe('no gradients', () => {
  it('uses flat fills and rules, never a CSS gradient', () => {
    const offenders = FILES
      .filter((f) => f.endsWith('.css'))
      .filter((f) => /linear-gradient|radial-gradient|conic-gradient/.test(readFileSync(f, 'utf8')))
    // The select caret is drawn from two hard-edged linear-gradients, which is
    // the standard way to make a triangle without an extra element.
    expect(offenders.filter((f) => !f.endsWith('app.css'))).toEqual([])

    const app = readFileSync('src/styles/app.css', 'utf8')
    const uses = app.match(/(linear|radial|conic)-gradient/g) ?? []
    expect(uses.length).toBeLessThanOrEqual(2)
  })

  it('draws no gradient in an SVG either', () => {
    const offenders = FILES
      .filter((f) => f.endsWith('.tsx'))
      .filter((f) => /<linearGradient|<radialGradient/.test(readFileSync(f, 'utf8')))
    // The only exceptions are the two area fills, where the fade to the surface
    // is a magnitude cue rather than decoration.
    expect(offenders.sort()).toEqual(['src/charts/Charts.tsx', 'src/charts/VaultProjection.tsx'])
  })
})

describe('the palette holds', () => {
  it('keeps the eight validated type hues exactly as the validator saw them', () => {
    const tokens = readFileSync('src/styles/tokens.css', 'utf8')
    for (const hex of ['#2a78d6', '#eb6834', '#1baf7a', '#eda100',
                       '#e87ba4', '#008300', '#0099b0', '#e34948']) {
      expect(tokens).toContain(hex)
    }
  })

  it('has no purple accent', () => {
    const tokens = readFileSync('src/styles/tokens.css', 'utf8')
    const hexes = tokens.match(/#[0-9a-f]{6}/gi) ?? []
    const purples = hexes.filter((hex) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      // Violet leans blue: blue clearly over green, red well over green, and
      // blue ahead of red. Pink fails the last clause, which is the point —
      // the bloom type is pink and belongs in the validated palette.
      return b > g + 40 && r > g + 25 && b > r && b > 90
    })
    expect(purples).toEqual([])
  })
})
