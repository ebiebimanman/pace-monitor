import { describe, expect, it } from 'vitest'
import { pickNotification } from './useNotifications'
import { sampleDay } from '../lib/__fixtures__/sayama-2026-10-01'
import type { PaceDownZone } from '../lib/condition'

const zone: PaceDownZone = { start: 12.75, end: 14, min: 68, strong: false, cause: 'lunch' }
const base = {
  settings: sampleDay.settings,
  today: '2026-10-01',
  zones: [zone],
  zoneName: () => '食後のリズム',
  checkedIn: true,
  ventHours: 0,
  breakHours: 0,
}
const fresh = { date: '2026-10-01', ids: [], last: null }

describe('pickNotification', () => {
  it('ペースダウンの 5 分前に N1 を出す', () => {
    const n = pickNotification({ ...base, now: 12.75 - 4 / 60 }, fresh)
    expect(n?.id).toBe('n1-12.75')
    expect(n?.body).toContain('12:45頃から集中が落ちやすくなります（食後のリズム）')
  })

  it('同じ区間の N1 は 1 回だけ', () => {
    expect(pickNotification({ ...base, now: 12.7 }, { ...fresh, ids: ['n1-12.75'] })).toBeNull()
  })

  it('5 分前を逃しても、区間の途中なら N1 を出す', () => {
    const n = pickNotification({ ...base, now: 13.5 }, fresh)
    expect(n?.id).toBe('n1-12.75')
    expect(n?.title).toBe('ペースダウン時間に入っています')
    expect(n?.body).toContain('14:00頃まで')
  })

  it('区間が終わったら N1 は出さない', () => {
    expect(pickNotification({ ...base, now: 14 }, fresh)).toBeNull()
  })

  it('区間の開始が少しずれても、同じ区間の N1 は出し直さない', () => {
    const moved = { ...zone, start: 13, end: 14.25 }
    expect(pickNotification({ ...base, zones: [moved], now: 13.1 }, { ...fresh, ids: ['n1-12.75'] })).toBeNull()
  })

  it('N1 は前の通知から 1 時間以内でも出す', () => {
    expect(pickNotification({ ...base, now: 12.7 }, { ...fresh, last: 12.2 })?.id).toBe('n1-12.75')
  })

  it('N2・N3 は前の通知から 1 時間以内は出さない', () => {
    expect(pickNotification({ ...base, zones: [], checkedIn: false, now: 9.5 }, { ...fresh, last: 9 })).toBeNull()
  })

  it('仕事開始を過ぎて未チェックインなら N2', () => {
    expect(pickNotification({ ...base, zones: [], checkedIn: false, now: 9.5 }, fresh)?.id).toBe('n2')
  })

  it('仕事時間外は出さない', () => {
    expect(pickNotification({ ...base, zones: [], checkedIn: false, now: 19 }, fresh)).toBeNull()
  })

  it('N3 は既定でオフ。オンならペースダウン中の換気不足で出す', () => {
    const input = { ...base, now: 13.5, ventHours: 2 }
    expect(pickNotification(input, { ...fresh, ids: ['n1-12.75'] })).toBeNull()
    const on = { ...input, settings: { ...base.settings, notify: { n1: true, n2: true, n3: true } } }
    expect(pickNotification(on, { ...fresh, ids: ['n1-12.75'] })?.id).toBe('n3-12.75')
  })
})
