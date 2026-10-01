import type { Hhmm } from './types'

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** "HH:MM" → その日の 0 時からの時間（小数） */
export function toHours(hhmm: Hhmm): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h + m / 60
}

/** 時間（小数） → "H:MM" */
export function fmt(hours: number): string {
  const total = Math.round((((hours % 24) + 24) % 24) * 60)
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

/** 時間（小数） → "1時間35分" */
export function formatDuration(hours: number): string {
  const total = Math.max(0, Math.round(hours * 60))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m}分`
  return `${h}時間${m ? `${m}分` : ''}`
}

/** 就寝から起床までの時間。日付をまたぐ場合も扱う */
export function sleepHours(bed: Hhmm, wake: Hhmm): number {
  return (((toHours(wake) - toHours(bed)) % 24) + 24) % 24
}
