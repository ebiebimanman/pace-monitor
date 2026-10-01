import { describe, expect, it } from 'vitest'
import { sampleDay } from './__fixtures__/sayama-2026-10-01'
import { indoorHumidity } from './humidity'
import { computeCurve, computeHero, findZones } from './condition'
import { suggest } from './causes'
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

  it('13:30 に「眠い・ぼーっとする」なら 換気 → 歩く → カーテン の順', () => {
    const s = suggest(sampleDay, 13.5, ['眠い', 'ぼーっとする'], [])
    expect(s.map((x) => x.cause)).toEqual(['vent', 'lunch', 'sun'])
    expect(s[0].confidence).toBe(3)
  })
})
