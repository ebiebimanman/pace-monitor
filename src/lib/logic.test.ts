import { describe, expect, it } from 'vitest'
import { sampleDay } from './__fixtures__/sayama-2026-10-01'
import { humidityLabel, indoorHumidity } from './humidity'
import { computeCurve, computeHero, findZones, hoursSince, lunchDipTime, mealPreview } from './condition'
import { suggest } from './causes'
import { cycleInfo, cyclePhase } from './cycle'
import { fmt, sleepHours } from './time'
import type { HourlyWeather } from './types'

const flat = (temp: number, rh: number): HourlyWeather => ({
  temp: Array(24).fill(temp),
  rh: Array(24).fill(rh),
  pressure: Array(24).fill(1013),
  radiation: Array(24).fill(0),
  cloud: Array(24).fill(0),
})

describe('time', () => {
  it('日付をまたぐ睡眠時間を計算する', () => {
    expect(sleepHours('23:30', '07:00')).toBe(7.5)
    expect(sleepHours('00:30', '07:00')).toBe(6.5)
  })
})

describe('indoorHumidity', () => {
  it('外気 5℃・50% を 21℃ に暖房すると約 18%', () => {
    expect(Math.round(indoorHumidity(flat(5, 50), 12, 'heat', 21))).toBe(18)
  })
  it('湿度 79% でも 21℃ なら「蒸し暑い」ではなく「湿気が多め」', () => {
    expect(humidityLabel(79, 21)).toBe('湿気が多め')
    expect(humidityLabel(79, 28)).toBe('蒸し暑い')
  })
  it('冷房は 40〜65% に収める', () => {
    expect(indoorHumidity(flat(32, 90), 12, 'cool', 26)).toBe(65)
  })
  it('冷暖房なしは外気の湿度のまま', () => {
    expect(indoorHumidity(flat(20, 55), 12, 'none', 26)).toBe(55)
  })
})

describe('狭山市 2026-10-01 のサンプル', () => {
  const hero = computeHero(sampleDay)
  const curve = computeCurve(sampleDay, hero)

  it('今日のコンディションは 80%', () => {
    expect(hero.value).toBe(80)
  })

  it('曲線は仕事時間の前後 2 時間（7:00〜20:00）を 15 分刻みで持つ', () => {
    expect(curve.range).toEqual([7, 20])
    expect(curve.points).toHaveLength(53)
  })

  it('ペースダウン時間は 12:45–14:00（食後のリズム）', () => {
    const zones = findZones(sampleDay, hero, curve)
    expect(zones.map((z) => `${fmt(z.start)}-${fmt(z.end)} ${z.cause}`)).toEqual(['12:45-14:00 lunch'])
  })

  it('「ご飯食べた」を 13:30 に記録すると、食後の谷は 14:15 にずれる', () => {
    const day = { ...sampleDay, logs: [...sampleDay.logs, { type: 'meal' as const, at: 13.5 }] }
    expect(fmt(lunchDipTime(day) ?? 0)).toBe('14:15')
  })

  it('「ご飯食べた」がない日は食後の谷を作らない', () => {
    const day = { ...sampleDay, logs: sampleDay.logs.filter((e) => e.type !== 'meal') }
    expect(lunchDipTime(day)).toBeNull()
    expect(findZones(day, hero, computeCurve(day, hero)).some((z) => z.cause === 'lunch')).toBe(false)
  })

  it('12:00 にホバーすると、いま食べたときのペースダウン時間を出す', () => {
    const day = { ...sampleDay, logs: sampleDay.logs.filter((e) => e.type !== 'meal') }
    expect(mealPreview(day, 12)).toMatch(/^いま食べると、\d+分後の12:\d\dから1[23]:\d\dまで/)
  })

  it('「MTG後でぐったり」なら MTG疲れの対処がいちばん上に出る', () => {
    const s = suggest(sampleDay, 10, ['MTG後でぐったり'], [])
    expect(s[0].cause).toBe('meeting')
    expect(s[0].log).toBe('break')
  })

  it('朝食の記録（8:00）は食後の谷に使わない', () => {
    const day = { ...sampleDay, logs: [{ type: 'meal' as const, at: 8 }] }
    expect(lunchDipTime(day)).toBeNull()
  })

  it('13:30 に「眠い・ぼーっとする」なら 換気 → 歩く → カーテン の順', () => {
    const s = suggest(sampleDay, 13.5, ['眠い', 'ぼーっとする'], [])
    expect(s.map((x) => x.cause)).toEqual(['vent', 'lunch', 'sun'])
    expect(s[0].confidence).toBe(3)
  })
})

describe('hoursSince（休憩の長さ）', () => {
  const logs = [{ type: 'break' as const, at: 14, minutes: 60 }]
  it('休憩中は 0', () => {
    expect(hoursSince(logs, 'break', 14.5, 9)).toBe(0)
  })
  it('休憩が終わってから数える', () => {
    expect(hoursSince(logs, 'break', 16, 9)).toBe(1)
  })
  it('長さのない記録は押した時刻から数える', () => {
    expect(hoursSince([{ type: 'break', at: 14 }], 'break', 16, 9)).toBe(2)
  })
})

describe('月経周期', () => {
  const s = { ...sampleDay.settings, sex: 'female' as const, lastPeriod: '2026-09-30', cycleLength: 28 }
  it('開始日を 1 日目として数える', () => {
    expect(cycleInfo(s, '2026-09-30')).toEqual({ day: 1, untilNext: 28 })
    expect(cyclePhase(cycleInfo(s, '2026-10-01'))).toBe('period')
    expect(cyclePhase(cycleInfo(s, '2026-10-04'))).toBe('periodLate')
    expect(cyclePhase(cycleInfo(s, '2026-10-15'))).toBe(null)
  })
  it('次の月経の前 7 日は月経前、周期を過ぎたら繰り返す', () => {
    expect(cyclePhase(cycleInfo(s, '2026-10-21'))).toBe('pms')
    expect(cycleInfo(s, '2026-10-28')).toEqual({ day: 1, untilNext: 28 })
  })
  it('女性以外・未入力・未来の日付は使わない', () => {
    expect(cycleInfo({ ...s, sex: 'male' }, '2026-10-01')).toBe(null)
    expect(cycleInfo({ ...s, lastPeriod: null }, '2026-10-01')).toBe(null)
    expect(cycleInfo(s, '2026-09-01')).toBe(null)
  })
  it('月経中は HERO から引く', () => {
    const day = { ...sampleDay, settings: s, cycle: cycleInfo(s, '2026-10-01') }
    const hero = computeHero(day)
    expect(hero.deductions.some((x) => x.label === '月経2日目')).toBe(true)
    expect(hero.value).toBeLessThan(computeHero(sampleDay).value)
  })
})

describe('朝型・夜型', () => {
  const at = (chronotype: 'morning' | 'neither' | 'evening') => {
    const day = { ...sampleDay, settings: { ...sampleDay.settings, chronotype } }
    const curve = computeCurve(day, computeHero(day))
    const v = (t: number) => curve.points.reduce((a, p) => (Math.abs(p.t - t) < Math.abs(a.t - t) ? p : a)).value
    return { early: v(9), late: v(17.5) }
  }
  it('朝型は朝が高く、夜型は夕方が高い', () => {
    const m = at('morning')
    const e = at('evening')
    expect(m.early).toBeGreaterThan(e.early)
    expect(e.late).toBeGreaterThan(m.late)
  })
})
