import { cyclePhase } from './cycle'
import type { DayInput, LogEvent, LogType } from './types'
import { clamp, fmt, formatDuration, sleepHours, toHours } from './time'
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
  add(`睡眠${formatDuration(sleep)}`, Math.min(25, Math.max(0, 7 - sleep) * 8))
  add(`睡眠の質「${SLEEP_Q_LABEL[c.sleepQ]}」`, [0, 0, 4, 10][c.sleepQ])
  const wakeGap = Math.abs(((((toHours(c.wake) - toHours(s.wake) + 12) % 24) + 24) % 24) - 12)
  add(`起床時刻がいつもと${formatDuration(wakeGap)}ずれた`, wakeGap >= 2 ? 6 : wakeGap >= 1 ? 3 : 0)
  add(`体調「${COND_LABEL[c.cond]}」`, [0, 0, 5, 12][c.cond])
  add(`症状：${c.symptoms.join('・')}`, Math.min(9, c.symptoms.length * 3))
  const phase = cyclePhase(d.cycle)
  if (phase === 'period') add(`月経${d.cycle!.day}日目`, 10)
  if (phase === 'periodLate') add(`月経${d.cycle!.day}日目`, 5)
  if (phase === 'pms') add(`月経前（次の月経まで約${d.cycle!.untilNext}日）`, 6)

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
  add(`1日中くもり（雲量${Math.round(cloud)}%）`, cloud >= 85 ? 3 : 0)

  const total = out.reduce((a, b) => a + b.points, 0)
  out.sort((a, b) => b.points - a.points)
  return { value: clamp(100 - total, 10, 100), deductions: out, sleep }
}

/** 記録が効き始める時刻。休憩は終わった時点から数える */
export const logEnd = (e: LogEvent) => e.at + (e.minutes ?? 0) / 60

/** 最後の記録からの経過時間。記録がなければ仕事開始を起点にする。休憩中は 0 */
export function hoursSince(logs: LogEvent[], type: LogType, t: number, workStart: number): number {
  let last: LogEvent | null = null
  for (const e of logs) if (e.type === type && e.at <= t && (last === null || e.at > last.at)) last = e
  return Math.max(0, t - (last ? logEnd(last) : workStart))
}

export type ComponentKey =
  | 'grog' | 'morning' | 'lunch' | 'second' | 'fatigue'
  | 'vent' | 'brk' | 'sun' | 'press' | 'heat'
export type Components = Record<ComponentKey, number>

/** 昼食の記録として扱う時間帯。朝食や夕食の記録は昼の谷に使わない */
const LUNCH_WINDOW = [10, 16] as const

/** 食後の谷の時刻。今日「ご飯食べた」を記録した日だけ、その時刻から求める。食べていない日は null（谷を作らない） */
export function lunchDipTime(d: DayInput): number | null {
  const meals = d.logs.filter((e) => e.type === 'meal' && e.at >= LUNCH_WINDOW[0] && e.at <= LUNCH_WINDOW[1])
  return meals.length ? Math.max(...meals.map((e) => e.at)) + 0.75 : null
}

/** 仕様 5-3：その時刻の曲線の各項 */
export function components(d: DayInput, t: number, sleep: number): Components {
  const { checkin: c, weather: w, logs } = d
  const wake = toHours(c.wake)
  const workStart = toHours(d.settings.workStart)
  const tau = ((((t - wake) % 24) + 24) % 24)
  const k = Math.min(1.6, 1 + Math.max(0, 7 - sleep) * 0.15)
  const dip = lunchDipTime(d)
  const temp = weatherAt(w, 'temp', t)
  return {
    grog: -15 * Math.exp(-tau / 0.75),
    morning: 6 * Math.sin((Math.PI * clamp(tau - 1, 0, 5)) / 5),
    lunch: dip === null ? 0 : -10 * k * Math.exp(-((t - dip) ** 2) / (2 * 0.7 ** 2)),
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
  morning: '起きて数時間の集中しやすさ',
  lunch: '食後のリズム',
  second: '夕方に持ち直す',
  fatigue: '1日の疲れ',
  vent: '換気してから時間がたった',
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
  grog: { name: '起きてすぐ', tip: '起きてすぐは、頭がまだ働き始めていません。メールの確認や今日の段取りから始めましょう。' },
  lunch: { name: '食後のリズム', tip: '食後は、誰でも眠くなりやすい時間です。資料の見直しや返信、単純な入力作業など、深く考えなくてもできる作業に向いています。' },
  vent: { name: '空気がこもりやすい', tip: '窓を5分開けて換気すると、集中が戻りやすくなります。［窓開けた］を押すと、グラフを計算し直します。' },
  brk: { name: '休憩なしが続く', tip: '一度立ち上がって遠くを見てから、作業に戻りましょう。' },
  sun: { name: '日差しが強め', tip: '日差しで画面が見えにくくなる時間です。カーテンや画面の明るさを先に調整しておきましょう。' },
  press: { name: '気圧が下がる予報', tip: '気圧が下がると、頭が重く感じる人がいます。考える作業はこの時間より前に済ませて、この時間は整理や片付けに回しましょう。' },
  fatigue: { name: '1日の疲れ', tip: '1日の疲れがたまってくる時間です。今日のふりかえりや明日の準備に向いています。' },
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
    return { ...base, tip: `${base.tip} 今日は睡眠が短いので、いつもより眠くなりやすいです。15分以内の仮眠をとると、眠気が軽くなります。` }
  }
  return base
}

/** 「ご飯食べた」ボタンのホバー表示：いま食べたら、食後の谷がいつ・どれくらい来るか */
export function mealPreview(d: DayInput, now: number): string {
  if (now < LUNCH_WINDOW[0] || now > LUNCH_WINDOW[1]) return '10〜16時以外の食事は、予報に使いません'
  const sim: DayInput = { ...d, logs: [...d.logs, { type: 'meal', at: now }] }
  const hero = computeHero(sim)
  const curve = computeCurve(sim, hero)
  const dip = now + 0.75
  const [, w1] = workRange(d)
  if (dip > w1) return `いま食べると、眠くなりやすい時間（${fmt(dip)}頃）は仕事が終わったあとになります`
  const zone = findZones(sim, hero, curve).find((z) => z.start <= dip && dip <= z.end)
  if (!zone) {
    const low = Math.round(valueAt(sim, hero, curve, dip).value)
    return `いま食べると、${formatDuration(dip - now)}後の${fmt(dip)}頃に集中が少し落ちます（${low}%）。ペースダウン時間にはならない見込みです`
  }
  const span = zone.start > now ? `${formatDuration(zone.start - now)}後の${fmt(zone.start)}から${fmt(zone.end)}まで` : `${fmt(zone.end)}まで`
  const overlap = zone.cause === 'lunch' ? '' : `。「${zoneText(sim, zone, hero.sleep).name}」のペースダウンと重なります`
  return `いま食べると、${span}が${zone.strong ? 'ペースダウン' : 'ややペースダウン'}の時間になります（最低${Math.round(zone.min)}%）${overlap}`
}

export function heroComment(value: number): string {
  if (value >= 80) return '睡眠・体調・天気の条件がそろっています。重い作業は午前のうちに進めましょう。'
  if (value >= 60) return 'まずまずの日です。ペースダウン時間に軽い作業を回せば、予定どおり進められます。'
  if (value >= 40) return '今日は少し集中しにくい日です。大事な作業は、グラフが高い時間帯に入れましょう。'
  return '今日はかなり集中しにくい日です。無理をせず、こまめに換気と休憩をとりましょう。'
}
