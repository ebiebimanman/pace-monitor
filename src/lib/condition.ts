import type { DayInput, LogEvent, LogType } from './types'
import { clamp, formatDuration, sleepHours, toHours } from './time'
import { indoorHumidity } from './humidity'
import { pressureDrop, weatherAt } from './weather'

const SLEEP_Q_LABEL = ['', 'よく眠れた', 'ふつう', 'いまいち']
const COND_LABEL = ['', 'いい', 'ふつう', 'いまいち']

export interface Deduction {
  label: string
  points: number
}

export interface Hero {
  /** 今日のコンディション（10〜100） */
  value: number
  /** 減点の大きい順 */
  deductions: Deduction[]
  sleep: number
}

const workRange = (d: DayInput) => [toHours(d.settings.workStart), toHours(d.settings.workEnd)] as const

/** 仕様 5-2：今日のコンディション */
export function computeHero(d: DayInput): Hero {
  const { checkin: c, settings: s, weather: w } = d
  const [w0, w1] = workRange(d)
  const out: Deduction[] = []
  const add = (label: string, points: number) => {
    if (points > 0) out.push({ label, points: Math.round(points) })
  }

  const sleep = sleepHours(c.bed, c.wake)
  add(`睡眠 ${formatDuration(sleep)}`, Math.min(25, Math.max(0, 7 - sleep) * 8))
  add(`睡眠の質「${SLEEP_Q_LABEL[c.sleepQ]}」`, [0, 0, 4, 10][c.sleepQ])
  const wakeGap = Math.abs(((((toHours(c.wake) - toHours(s.wake) + 12) % 24) + 24) % 24) - 12)
  add(`起床時刻がいつもと${formatDuration(wakeGap)}ずれ`, wakeGap >= 2 ? 6 : wakeGap >= 1 ? 3 : 0)
  add(`体調「${COND_LABEL[c.cond]}」`, [0, 0, 5, 12][c.cond])
  add(`症状：${c.symptoms.join('・')}`, Math.min(9, c.symptoms.length * 3))

  let maxDrop = 0
  for (let t = w0; t <= w1 - 3; t += 0.25) {
    maxDrop = Math.max(maxDrop, weatherAt(w, 'pressure', t) - weatherAt(w, 'pressure', t + 3))
  }
  add(`気圧が下がる予報（3時間で${maxDrop.toFixed(1)}hPa）`, maxDrop >= 4 ? 8 : maxDrop >= 2 ? 4 : 0)

  let rhSum = 0
  let tempSum = 0
  let cloudSum = 0
  let n = 0
  for (let t = w0; t <= w1; t += 0.5) {
    rhSum += indoorHumidity(w, t, c.aircon, c.acTemp)
    tempSum += weatherAt(w, 'temp', t)
    cloudSum += weatherAt(w, 'cloud', t)
    n++
  }
  n = Math.max(1, n)
  const rh = rhSum / n
  const temp = tempSum / n
  const cloud = cloudSum / n
  add(`室内の湿度 約${Math.round(rh)}%`, rh < 30 ? 6 : rh < 40 ? 3 : rh > 70 ? 4 : 0)
  add(`冷暖房なしで外気温${Math.round(temp)}℃`, c.aircon === 'none' && (temp > 28 || temp < 12) ? 5 : 0)
  add(`一日どんより（雲量${Math.round(cloud)}%）`, cloud >= 85 ? 3 : 0)

  const total = out.reduce((a, b) => a + b.points, 0)
  out.sort((a, b) => b.points - a.points)
  return { value: clamp(100 - total, 10, 100), deductions: out, sleep }
}

/** 最後の記録からの経過時間。記録がなければ仕事開始を起点にする */
export function hoursSince(logs: LogEvent[], type: LogType, t: number, workStart: number): number {
  let last: number | null = null
  for (const e of logs) if (e.type === type && e.at <= t && (last === null || e.at > last)) last = e.at
  return t - (last ?? workStart)
}

export type ComponentKey =
  | 'grog' | 'morning' | 'lunch' | 'second' | 'fatigue'
  | 'vent' | 'brk' | 'sun' | 'press' | 'heat'
export type Components = Record<ComponentKey, number>

export const lunchDipTime = (d: DayInput) => clamp(toHours(d.settings.lunchEnd) + 0.75, 13, 15)

/** 仕様 5-3：その時刻の曲線の各項 */
export function components(d: DayInput, t: number, sleep: number): Components {
  const { checkin: c, weather: w, logs } = d
  const wake = toHours(c.wake)
  const workStart = toHours(d.settings.workStart)
  const tau = ((((t - wake) % 24) + 24) % 24)
  const k = Math.min(1.6, 1 + Math.max(0, 7 - sleep) * 0.15)
  const temp = weatherAt(w, 'temp', t)
  return {
    grog: -15 * Math.exp(-tau / 0.75),
    morning: 6 * Math.sin((Math.PI * clamp(tau - 1, 0, 5)) / 5),
    lunch: -10 * k * Math.exp(-((t - lunchDipTime(d)) ** 2) / (2 * 0.7 ** 2)),
    second: 4 * Math.exp(-((t - (wake + 10.5)) ** 2) / (2 * 1.2 ** 2)),
    fatigue: -Math.max(0, tau - 10),
    vent: -Math.min(8, Math.max(0, (hoursSince(logs, 'window', t, workStart) * 60 - 60) / 10)),
    brk: -Math.min(8, Math.max(0, (hoursSince(logs, 'break', t, workStart) * 60 - 90) / 8)),
    sun: weatherAt(w, 'radiation', t) > 600 && t >= 13 && t <= 17 ? -3 : 0,
    press: pressureDrop(w, t) >= 2 ? -4 : 0,
    heat: c.aircon === 'none' && (temp > 28 || temp < 12) ? -3 : 0,
  }
}

const sum = (c: Components) => Object.values(c).reduce((a, b) => a + b, 0)

export interface CurvePoint {
  t: number
  value: number
  parts: Components
}

export interface Curve {
  points: CurvePoint[]
  /** 仕事時間内の D(t) の平均 */
  mean: number
  range: [number, number]
}

/** 仕様 5-3：15 分刻みの曲線（仕事時間の前後 2 時間） */
export function computeCurve(d: DayInput, hero: Hero): Curve {
  const [w0, w1] = workRange(d)
  const range: [number, number] = [w0 - 2, w1 + 2]
  const raw: { t: number; parts: Components; d: number }[] = []
  for (let t = range[0]; t <= range[1] + 1e-9; t += 0.25) {
    const parts = components(d, t, hero.sleep)
    raw.push({ t, parts, d: sum(parts) })
  }
  const work = raw.filter((p) => p.t >= w0 && p.t <= w1)
  const mean = work.length ? work.reduce((a, p) => a + p.d, 0) / work.length : 0
  const points = raw.map((p) => ({ t: p.t, parts: p.parts, value: clamp(hero.value + p.d - mean, 5, 100) }))
  return { points, mean, range }
}

/** 任意の時刻のコンディション（記録の直後など、15 分刻みに乗らない時刻用） */
export function valueAt(d: DayInput, hero: Hero, curve: Curve, t: number) {
  const parts = components(d, t, hero.sleep)
  return { parts, value: clamp(hero.value + sum(parts) - curve.mean, 5, 100) }
}

const ZONE_CAUSES = ['grog', 'lunch', 'vent', 'brk', 'sun', 'press', 'fatigue', 'heat'] as const
export type ZoneCause = (typeof ZONE_CAUSES)[number]

export interface PaceDownZone {
  start: number
  end: number
  min: number
  strong: boolean
  cause: ZoneCause
}

/** 仕様 5-4：ペースダウン区間（最大 3 つ、時刻順） */
export function findZones(d: DayInput, hero: Hero, curve: Curve): PaceDownZone[] {
  const [w0, w1] = workRange(d)
  const runs: CurvePoint[][] = []
  let cur: CurvePoint[] | null = null
  for (const p of curve.points) {
    const inWork = p.t >= w0 && p.t <= w1
    if (inWork && p.value <= hero.value - 8) (cur ??= []).push(p)
    else if (cur) {
      runs.push(cur)
      cur = null
    }
  }
  if (cur) runs.push(cur)

  return runs
    .filter((r) => r.length >= 3)
    .map((r) => {
      const low = r.reduce((a, p) => (p.value < a.value ? p : a), r[0])
      const cause = ZONE_CAUSES.reduce((a, k) => (low.parts[k] < low.parts[a] ? k : a), ZONE_CAUSES[0])
      return { start: r[0].t, end: r[r.length - 1].t, min: low.value, strong: low.value <= hero.value - 15, cause }
    })
    .sort((a, b) => a.min - b.min)
    .slice(0, 3)
    .sort((a, b) => a.start - b.start)
}

const isHot = (d: DayInput, t: number) => weatherAt(d.weather, 'temp', t) >= 20

const COMPONENT_LABEL: Record<ComponentKey, string> = {
  grog: '起きてすぐ',
  morning: '午前の山',
  lunch: '食後のリズム',
  second: '夕方の盛り返し',
  fatigue: '1日の疲れ',
  vent: '換気から時間がたつ',
  brk: '休憩なしが続く',
  sun: '日差しが強い',
  press: '気圧が下がる',
  heat: '暑い',
}

export function componentLabel(d: DayInput, key: ComponentKey, t: number): string {
  if (key === 'heat') return isHot(d, t) ? '暑い' : '寒い'
  return COMPONENT_LABEL[key]
}

const ZONE_TEXT: Record<ZoneCause, { name: string; tip: string }> = {
  grog: { name: '起きてすぐ', tip: '頭がまだ温まっていません。メールの確認や今日の段取りから始めるのがおすすめです。' },
  lunch: { name: '食後のリズム', tip: '誰にでも来る午後の谷です。資料の見直し、返信、単純な入力作業など「手が動く作業」向きの時間です。' },
  vent: { name: '空気がこもりやすい', tip: '窓を5分開けると戻りやすくなります。［窓開けた］を押すと曲線が更新されます。' },
  brk: { name: '休憩なしが続く', tip: '一度立ち上がって、遠くを見てから戻りましょう。' },
  sun: { name: '日差しが強め', tip: '画面がまぶしくなりやすい時間です。カーテンや画面の明るさを先に調整しておきましょう。' },
  press: { name: '気圧が下がる予報', tip: '頭が重く感じやすい時間です。考える作業は前倒しにして、この時間は整理や片付けを。' },
  fatigue: { name: '1日の疲れ', tip: '新しいことより、今日のふりかえりや明日の準備に向いた時間です。' },
  heat: { name: '暑い', tip: '' },
}

export function zoneText(d: DayInput, zone: PaceDownZone, sleep: number): { name: string; tip: string } {
  if (zone.cause === 'heat') {
    return isHot(d, zone.start)
      ? { name: '暑い', tip: '冷暖房なしだと部屋が暑くなりやすい時間です。先に冷房を入れるか、首元を冷やしておきましょう。' }
      : { name: '寒い', tip: '冷暖房なしだと部屋が冷えやすい時間です。暖房を入れるか、1枚羽織っておきましょう。' }
  }
  const base = ZONE_TEXT[zone.cause]
  if (zone.cause === 'lunch' && sleep < 6.5) {
    return { ...base, tip: `${base.tip} 今日は睡眠が短めなので谷が深め。15分以内の仮眠も効きます。` }
  }
  return base
}

export function heroComment(value: number): string {
  if (value >= 80) return 'いい条件がそろっています。重い作業は午前のうちに。'
  if (value >= 60) return 'まずまず。ペースダウン時間に軽い作業を回せば十分です。'
  if (value >= 40) return '今日は少し控えめ。大事な作業は調子の山に寄せましょう。'
  return '無理せずいきましょう。こまめな換気と休憩がいちばん効きます。'
}
