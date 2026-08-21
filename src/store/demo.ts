import type { Entry, State, Vault } from '@/domain/types'
import { addDays, addMonths, monthStart, todayISO, weekStart } from '@/domain/dates'
import { seeded } from '@/domain/rng'
import { initialState, newId } from './defaults'

/**
 * A believable six months of saving, generated relative to today so the demo is
 * always current. Seeded, so it looks the same every time it's loaded — and it
 * deliberately includes a bad patch and a couple of withdrawals, because an
 * unbroken wall of green would be a lie about what saving looks like.
 */
export function demoState(): State {
  const rng = seeded('hoard-demo-v1')
  const today = todayISO()
  const base = initialState()

  const christmasYear = today <= `${today.slice(0, 4)}-12-20`
    ? today.slice(0, 4)
    : String(Number(today.slice(0, 4)) + 1)

  const mk = (v: Omit<Vault, 'id' | 'completedAt' | 'archived'> & Partial<Vault>): Vault => ({
    id: newId('v_'),
    completedAt: null,
    archived: false,
    ...v,
  })

  const start = addDays(weekStart(today), -7 * 25)

  const christmas = mk({
    name: 'Christmas', emoji: '🎄', target: 60_000, deadline: `${christmasYear}-12-20`,
    color: 'rose', createdAt: addDays(start, 14), note: 'Presents, food, the lot', completedAt: null,
  })
  const trip = mk({
    name: 'Japan trip', emoji: '✈️', target: 240_000, deadline: addMonths(today, 9),
    color: 'azure', createdAt: start, note: 'Two weeks, spring', completedAt: null,
  })
  const rainy = mk({
    name: 'Emergency fund', emoji: '🛟', target: 150_000, deadline: null,
    color: 'teal', createdAt: start, note: 'Three months of rent', completedAt: null,
  })
  const phone = mk({
    name: 'New phone', emoji: '📱', target: 70_000, deadline: addMonths(today, -1),
    color: 'violet', createdAt: addDays(start, 7), note: 'The old one is held together with tape',
    completedAt: null,
  })

  const vaults = [christmas, trip, rainy, phone]
  const entries: Entry[] = []

  const push = (date: string, amount: number, vaultId: string | null, note = '', kind: Entry['kind'] = 'deposit') => {
    entries.push({
      id: newId('e_'), vaultId, amount, kind, date, note,
      createdAt: new Date(`${date}T${9 + Math.floor(rng() * 9)}:00:00`).getTime() + entries.length,
    })
  }

  const NOTES = ['Payday', 'Skipped a takeaway', 'Sold something', 'Round-up', 'Cancelled a subscription', '']

  for (let week = 0; week < 26; week++) {
    const monday = addDays(start, week * 7)
    if (monday > today) break

    // A rough patch around weeks 12–14 — this is what earns the freeze badge.
    const slump = week >= 12 && week <= 14
    if (slump && rng() < 0.75) continue

    const deposits = 1 + (rng() < 0.45 ? 1 : 0) + (rng() < 0.18 ? 1 : 0)
    for (let i = 0; i < deposits; i++) {
      const day = addDays(monday, Math.floor(rng() * 7))
      if (day > today) continue
      const roll = rng()
      const vault =
        roll < 0.3 ? phone.id
        : roll < 0.55 ? trip.id
        : roll < 0.75 ? christmas.id
        : roll < 0.92 ? rainy.id
        : null
      const amount = Math.round((1_500 + rng() * 6_500) / 100) * 100
      push(day, amount, vault, rng() < 0.4 ? NOTES[Math.floor(rng() * NOTES.length)] : '')
    }

    // Payday lump on the first week of each month.
    if (monday.slice(8) <= '07') {
      push(monday, 12_000 + Math.round(rng() * 60) * 100, rng() < 0.5 ? trip.id : rainy.id, 'Payday')
    }
  }

  // The phone got bought — fill it, then a real-life dip on the rainy-day fund.
  const phoneSaved = entries.filter((e) => e.vaultId === phone.id).reduce((n, e) => n + e.amount, 0)
  if (phoneSaved < 70_000) {
    push(addMonths(today, -1), 70_000 - phoneSaved, phone.id, 'Last push')
  }
  push(addDays(today, -38), 8_500, rainy.id, 'Car repair', 'withdrawal')
  push(addDays(today, -12), 4_000, null, '', 'deposit')
  push(addDays(today, -3), 6_000, christmas.id, 'Early present shopping')
  push(addDays(today, -1), 2_500, trip.id, '')

  return {
    ...base,
    profile: {
      ...base.profile,
      name: 'Sam',
      monthlyTarget: 40_000,
      onboarded: true,
      createdAt: monthStart(start),
    },
    vaults,
    entries: entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
  }
}
