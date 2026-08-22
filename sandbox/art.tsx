import { createRoot } from 'react-dom/client'
import { Creature, STAGE_AT_LEVEL, type Stage } from '@/ui/Creature'
import { Glyph, GLYPH_KEYS } from '@/ui/Glyphs'
import '@/styles/app.css'

const TYPES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#0099b0', '#e34948']
const NAVY = '#234a6e'

const H2: React.CSSProperties = {
  fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase',
  marginTop: 22, marginBottom: 8, fontFamily: 'Archivo, sans-serif',
}
const CARD: React.CSSProperties = {
  background: '#fff', border: '1.5px solid #131a17', borderRadius: 3, padding: 8,
}

/** The stage under active work, rendered large enough to actually judge. */
const FOCUS = Number(new URLSearchParams(location.search).get('focus') ?? '2') as Stage

function Sheet() {
  return (
    <div style={{ padding: 20, background: '#e6eae3', color: '#131a17', minHeight: '100vh', fontFamily: 'Archivo, sans-serif' }}>
      <h2 style={{ ...H2, marginTop: 0 }}>Focus — {STAGE_AT_LEVEL[FOCUS].name} at 300px, 128px, 64px</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ ...CARD, color: NAVY }}><Creature stage={FOCUS} size={300} /></div>
        <div style={{ ...CARD, color: NAVY }}><Creature stage={FOCUS} size={128} /></div>
        <div style={{ ...CARD, color: NAVY }}><Creature stage={FOCUS} size={64} /></div>
        <div style={{ ...CARD, background: '#171b21', color: NAVY }}><Creature stage={FOCUS} size={128} /></div>
        {/* Silhouette check: if this doesn't read, the drawing doesn't work. */}
        <div style={CARD}>
          <span style={{ display: 'block', color: '#131a17', filter: 'grayscale(1) brightness(0) ' }}>
            <Creature stage={FOCUS} size={128} />
          </span>
        </div>
      </div>

      <h2 style={H2}>The line — 128px</h2>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {STAGE_AT_LEVEL.map((s, i) => (
          <div key={s.name} style={{ textAlign: 'center' }}>
            <div style={{ ...CARD, color: TYPES[i] }}><Creature stage={s.stage} size={128} /></div>
            <div style={{ fontSize: 11, marginTop: 4 }}>{s.name} · Lv{s.level}</div>
          </div>
        ))}
      </div>

      <h2 style={H2}>The line in one accent — 128px</h2>
      <div style={{ ...CARD, display: 'flex', gap: 10, color: NAVY }}>
        {STAGE_AT_LEVEL.map((s) => <Creature key={s.name} stage={s.stage} size={128} />)}
      </div>

      <h2 style={H2}>Small — 28px, 44px, 62px (the sizes the app actually uses)</h2>
      <div style={{ ...CARD, display: 'flex', gap: 14, alignItems: 'center' }}>
        {STAGE_AT_LEVEL.map((s, i) => <span key={s.name} style={{ color: TYPES[i] }}><Creature stage={s.stage} size={28} /></span>)}
        {STAGE_AT_LEVEL.map((s, i) => <span key={s.name + 'b'} style={{ color: TYPES[i] }}><Creature stage={s.stage} size={44} /></span>)}
        {STAGE_AT_LEVEL.map((s, i) => <span key={s.name + 'c'} style={{ color: TYPES[i] }}><Creature stage={s.stage} size={62} /></span>)}
      </div>

      <h2 style={H2}>On dark — 96px</h2>
      <div style={{ display: 'flex', gap: 14, background: '#171b21', border: '1.5px solid #444', padding: 12, borderRadius: 3 }}>
        {STAGE_AT_LEVEL.map((s, i) => <span key={s.name} style={{ color: TYPES[i] }}><Creature stage={s.stage} size={96} /></span>)}
      </div>

      <h2 style={H2}>Vault glyphs — 26px</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
        {GLYPH_KEYS.map((k, i) => (
          <div key={k} style={{ ...CARD, display: 'grid', placeItems: 'center', color: TYPES[i % 8] }}>
            <Glyph name={k} size={26} />
          </div>
        ))}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Sheet />)
