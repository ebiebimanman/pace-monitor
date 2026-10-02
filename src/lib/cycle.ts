import type { Settings } from './types'

export const DEFAULT_CYCLE = 28

export interface CycleInfo {
  /** 月経が始まった日を 1 日目とする周期の日数 */
  day: number
  /** 次の月経が始まるまでの日数（予測） */
  untilNext: number
}

const dayNumber = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / 86400000

/** 最終月経の開始日から、今日が周期の何日目かを出す。周期を過ぎていれば同じ長さで繰り返すとみなす */
export function cycleInfo(s: Settings, today: string): CycleInfo | null {
  if (s.sex !== 'female' || !s.lastPeriod) return null
  const len = s.cycleLength ?? DEFAULT_CYCLE
  const diff = dayNumber(today) - dayNumber(s.lastPeriod)
  if (Number.isNaN(diff) || diff < 0) return null
  const day = (diff % len) + 1
  return { day, untilNext: len - day + 1 }
}

export type CyclePhase = 'period' | 'periodLate' | 'pms' | null

/** 1〜2 日目、3〜5 日目、次の月経の前 7 日 */
export function cyclePhase(c: CycleInfo | null | undefined): CyclePhase {
  if (!c) return null
  if (c.day <= 2) return 'period'
  if (c.day <= 5) return 'periodLate'
  if (c.untilNext <= 7) return 'pms'
  return null
}
