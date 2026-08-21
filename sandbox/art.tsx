import { createRoot } from 'react-dom/client'
import { Creature, STAGE_AT_LEVEL, type Stage } from '@/ui/Creature'
import { Glyph, GLYPH_KEYS } from '@/ui/Glyphs'
import '@/styles/app.css'

const TYPES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#0099b0', '#e34948']

function Sheet() {
  return (
    <div style={{ padding: 24, background: '#e6eae3', color: '#131a17', minHeight: '100vh', fontFamily: 'Archivo, sans-serif' }}>
      <h2 style={{ fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase' }}>Creature line — 96px</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 8 }}>
        {STAGE_AT_LEVEL.map((s, i) => (
          <div key={s.name} style={{ textAlign: 'center' }}>
            <div style={{ background: '#fff', border: '1.5px solid #131a17', borderRadius: 3, padding: 6, color: TYPES[i] }}>
              <Creature stage={s.stage as Stage} size={96} />
            </div>
            <div style={{ fontSize: 11, marginTop: 4 }}>{s.name} · Lv{s.level}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 20 }}>At 28px and 44px</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', border: '1.5px solid #131a17', padding: 10, borderRadius: 3 }}>
        {STAGE_AT_LEVEL.map((s, i) => <span key={s.name} style={{ color: TYPES[i] }}><Creature stage={s.stage as Stage} size={28} /></span>)}
        {STAGE_AT_LEVEL.map((s, i) => <span key={s.name + 'b'} style={{ color: TYPES[7 - i] }}><Creature stage={s.stage as Stage} size={44} /></span>)}
      </div>

      <h2 style={{ fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 20 }}>On dark</h2>
      <div style={{ display: 'flex', gap: 16, background: '#171b21', border: '1.5px solid #444', padding: 12, borderRadius: 3 }}>
        {STAGE_AT_LEVEL.map((s, i) => <span key={s.name} style={{ color: TYPES[i] }}><Creature stage={s.stage as Stage} size={72} /></span>)}
      </div>

      <h2 style={{ fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 20 }}>Vault glyphs — 26px</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
        {GLYPH_KEYS.map((k, i) => (
          <div key={k} style={{ background: '#fff', border: '1.5px solid #131a17', borderRadius: 3, padding: 8, display: 'grid', placeItems: 'center', color: TYPES[i % 8] }}>
            <Glyph name={k} size={26} />
          </div>
        ))}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Sheet />)
