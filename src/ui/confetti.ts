/**
 * Canvas confetti in ~70 lines. A library would be 12kB for this; the whole
 * effect is gravity, drag and a rotating rectangle.
 */

type Options = {
  count?: number
  colors?: string[]
  originY?: number
  spread?: number
  power?: number
}

const DEFAULT_COLORS = ['#f4c14b', '#ff8a3d', '#f472b6', '#a78bfa', '#60a5fa', '#2dd4bf', '#a3e635']

type Piece = {
  x: number; y: number; vx: number; vy: number
  size: number; rot: number; vr: number; color: string; life: number
}

export function confetti(options: Options = {}): void {
  if (typeof document === 'undefined') return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (document.body.dataset.reduceMotion === 'true') return

  const {
    count = 90,
    colors = DEFAULT_COLORS,
    originY = 0.42,
    spread = 1,
    power = 1,
  } = options

  const canvas = document.createElement('canvas')
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '9999',
  })
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) { canvas.remove(); return }
  ctx.scale(dpr, dpr)

  const pieces: Piece[] = Array.from({ length: count }, () => {
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 1.7 * spread
    const speed = (7 + Math.random() * 9) * power
    return {
      x: w / 2 + (Math.random() - 0.5) * w * 0.35,
      y: h * originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.34,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    }
  })

  let raf = 0
  const start = performance.now()

  const frame = (now: number) => {
    const elapsed = now - start
    ctx.clearRect(0, 0, w, h)

    for (const p of pieces) {
      p.vy += 0.34            // gravity
      p.vx *= 0.992           // drag
      p.vy *= 0.992
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      p.life = Math.max(0, 1 - elapsed / 2600)

      if (p.life <= 0 || p.y > h + 40) continue

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.55)
      ctx.restore()
    }

    if (elapsed < 2800) raf = requestAnimationFrame(frame)
    else { cancelAnimationFrame(raf); canvas.remove() }
  }

  raf = requestAnimationFrame(frame)
}
