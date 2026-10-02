import type { CauseKey, DayInput, LogType, Remedy } from './types'
import { clamp, fmt, formatDuration, sleepHours, toHours } from './time'
import { indoorHumidity } from './humidity'
import { pressureDrop, weatherAt } from './weather'
import { hoursSince, lunchDipTime } from './condition'

export const SYMPTOMS = ['眠い', 'ぼーっとする', '目が疲れる', '頭痛', 'イライラ', 'やる気が出ない', 'MTG後でぐったり'] as const

interface Remedial {
  name: string
  action: string
  /** 「やってみる」で自動的に入れる記録 */
  log: LogType | null
  symptoms: string[]
}

const REMEDIES: Record<CauseKey, Remedial> = {
  sleep: { name: '寝不足', action: '15分以内の仮眠、または外の光を浴びて5分歩く', log: null, symptoms: ['眠い', 'ぼーっとする'] },
  lunch: { name: '昼食後の眠気', action: '5分歩く、または立って作業する', log: 'break', symptoms: ['眠い'] },
  vent: { name: '換気不足', action: '窓を5分開けて、深呼吸を3回', log: 'window', symptoms: ['ぼーっとする', '頭痛'] },
  sun: { name: '明るすぎ', action: 'カーテンを閉めるか、画面の明るさを下げる', log: null, symptoms: ['目が疲れる'] },
  dry: { name: '乾燥', action: 'コップ1杯の水を飲む。目薬もおすすめ', log: 'water', symptoms: ['目が疲れる', '頭痛'] },
  temp: { name: '暑い', action: '冷房を入れるか、首元を冷やす', log: null, symptoms: ['イライラ'] },
  break: { name: '休憩不足', action: '5分休憩。遠くを見て、肩を回す', log: 'break', symptoms: ['目が疲れる', 'イライラ'] },
  press: { name: '気圧の低下', action: '考える作業を後回しにして、整理や片付けに切り替える', log: null, symptoms: ['頭痛', 'ぼーっとする'] },
  meeting: { name: 'MTG疲れ', action: '画面から離れて5分歩くかストレッチ。戻ったら次の作業の「最初の1手」だけやる（ファイルを開く、1行書くなど）', log: 'break', symptoms: ['MTG後でぐったり'] },
  task: { name: 'タスクが曖昧', action: '次の一歩を1行だけ書き出して、25分だけやってみる', log: null, symptoms: ['やる気が出ない'] },
}

export interface Suggestion {
  cause: CauseKey
  name: string
  action: string
  log: LogType | null
  /** 0〜1 */
  score: number
  /** 確度 1〜3（●の数） */
  confidence: 1 | 2 | 3
  reason: string
}

/** 仕様 5-5：「集中切れた」の対処候補（効きそうな順に最大 3 件） */
export function suggest(d: DayInput, now: number, symptoms: string[], history: Remedy[]): Suggestion[] {
  const { checkin: c, weather: w, logs } = d
  const workStart = toHours(d.settings.workStart)
  const sleep = sleepHours(c.bed, c.wake)
  const dip = lunchDipTime(d)
  const vent = hoursSince(logs, 'window', now, workStart)
  const brk = hoursSince(logs, 'break', now, workStart)
  const rh = indoorHumidity(w, now, c.aircon, c.acTemp)
  const temp = weatherAt(w, 'temp', now)
  const rad = weatherAt(w, 'radiation', now)
  const drop = pressureDrop(w, now)
  const hot = temp >= 20

  const base: Record<CauseKey, [number, string]> = {
    sleep: [(sleep < 6 ? 0.6 : sleep < 6.5 ? 0.3 : 0) + (c.sleepQ === 3 ? 0.25 : 0), `睡眠${formatDuration(sleep)}・睡眠の質「${['', 'よく眠れた', 'ふつう', 'いまいち'][c.sleepQ]}」`],
    lunch: [dip !== null && Math.abs(now - dip) <= 1 ? 0.55 : 0, dip === null ? '' : `今は${fmt(now)}で、食後に眠くなりやすい時間（${fmt(dip)}頃）の前後です`],
    vent: [vent > 1.5 ? 0.4 + Math.min(0.3, (vent * 60 - 90) / 200) : vent > 1 ? 0.2 : 0, `窓を開けてから${formatDuration(vent)}たっています`],
    sun: [rad > 600 && now >= 13 && now <= 17 ? 0.5 : rad > 450 ? 0.2 : 0, `日差しが強い時間帯です（日射${Math.round(rad)}W/m²）`],
    dry: [rh < 25 ? 0.6 : rh < 35 ? 0.45 : 0, `室内の湿度は約${Math.round(rh)}%と推定しています`],
    temp: [c.aircon === 'none' && (temp > 28 || temp < 12) ? 0.5 : 0, `外気温が${Math.round(temp)}℃で、冷暖房を使っていません`],
    break: [brk > 2 ? 0.45 + Math.min(0.25, (brk - 2) * 0.2) : brk > 1.5 ? 0.2 : 0, `最後の休憩から${formatDuration(brk)}たっています`],
    press: [drop >= 2 ? 0.5 : drop >= 1 ? 0.2 : 0, `気圧が下がっています（前後3時間で${drop.toFixed(1)}hPa）`],
    // 本人の申告がそのまま根拠になる
    meeting: [symptoms.includes('MTG後でぐったり') ? 0.6 : 0, 'MTGで話す・聞く・気を遣うことが続き、頭も体も疲れています。オンラインのMTGは座ったまま画面を見続けるので、特に疲れやすくなります'],
    task: [0, '環境や体調に目立つ原因が見当たりません'],
  }
  const others = Math.max(...Object.values(base).map(([s]) => s))
  const onlyMotivation = symptoms.length === 1 && symptoms[0] === 'やる気が出ない'
  base.task[0] = others < 0.3 || onlyMotivation ? 0.5 : 0.1
  if (symptoms.includes('やる気が出ない')) base.task[1] = '「やる気が出ない」は、やることがぼんやりしているときにも起きます'

  const bias: Partial<Record<CauseKey, number>> = {}
  for (const r of history) {
    if (r.result === 'better') bias[r.cause] = (bias[r.cause] ?? 0) + 0.1
    if (r.result === 'same') bias[r.cause] = (bias[r.cause] ?? 0) - 0.1
  }

  return (Object.keys(base) as CauseKey[])
    .map((k) => {
      const [s, reason] = base[k]
      const meta = REMEDIES[k]
      let score = s
      if (s > 0 || k === 'task') score += meta.symptoms.filter((x) => symptoms.includes(x)).length * 0.15
      score = clamp(score + (bias[k] ?? 0), 0, 1)
      const name = k === 'temp' ? (hot ? '暑い' : '寒い') : meta.name
      const action = k === 'temp' ? (hot ? '冷房を入れるか、首元を冷やす' : '暖房を入れるか、1枚羽織る') : meta.action
      const confidence: 1 | 2 | 3 = score >= 0.66 ? 3 : score >= 0.4 ? 2 : 1
      return { cause: k, name, action, log: meta.log, score, confidence, reason }
    })
    .filter((x) => x.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}
