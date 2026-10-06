import { describe, expect, it } from 'vitest'
import { applyObservation, latestTemp, nearestStation, type StationEntry } from './amedas'
import { NEUTRAL_WEATHER } from '../hooks/useWeather'

const table: Record<string, StationEntry> = {
  // 所沢（気温あり）
  '43266': { elems: '11112010', lat: [35, 46.4], lon: [139, 24.8], kjName: '所沢' },
  // 狭山市のすぐ近くに置いた、気温を測っていない観測点
  '99999': { elems: '01000000', lat: [35, 51.2], lon: [139, 24.7], kjName: '雨量のみ' },
}

describe('nearestStation', () => {
  it('気温を測っている観測点から選ぶ', () => {
    const s = nearestStation(table, 35.853, 139.412)
    expect(s?.name).toBe('所沢')
    expect(s?.km).toBeGreaterThan(8)
    expect(s?.km).toBeLessThan(10)
  })

  it('30 km より遠ければ使わない', () => {
    expect(nearestStation(table, 36.5, 139.412)).toBeNull()
  })
})

describe('latestTemp', () => {
  it('いちばん新しい正常な値を返す', () => {
    const obs = latestTemp({
      '20261006162000': { temp: [26.3, 0] },
      '20261006163000': { temp: [26.1, 0] },
      '20261006164000': { temp: [null, 0] },
    })
    expect(obs).toEqual({ at: 16.5, temp: 26.1 })
  })

  it('品質フラグが 0 でない値は飛ばす', () => {
    expect(latestTemp({ '20261006150000': { temp: [25, 0] }, '20261006151000': { temp: [30, 5] } })?.temp).toBe(25)
  })
})

describe('applyObservation', () => {
  const w = { ...NEUTRAL_WEATHER, temp: Array(24).fill(23) }
  const out = applyObservation(w, { at: 16, temp: 26 })

  it('観測時刻までは差をそのまま足す', () => {
    expect(out.temp[9]).toBeCloseTo(26)
    expect(out.temp[16]).toBeCloseTo(26)
  })

  it('その後は 4 時間かけて予報に戻す', () => {
    expect(out.temp[18]).toBeCloseTo(24.5)
    expect(out.temp[20]).toBeCloseTo(23)
    expect(out.temp[23]).toBeCloseTo(23)
  })

  it('気温以外は変えない', () => {
    expect(out.pressure).toBe(w.pressure)
  })
})
