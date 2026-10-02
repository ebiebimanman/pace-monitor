import type { CycleInfo } from './cycle'

/** "HH:MM" 形式の時刻 */
export type Hhmm = string

export type Level = 1 | 2 | 3
export type Aircon = 'heat' | 'cool' | 'none'
export type Sex = 'female' | 'male'
export type Chronotype = 'morning' | 'neither' | 'evening'
export type LogType = 'window' | 'break' | 'water' | 'meal' | 'slump'
export type RemedyResult = 'better' | 'same' | 'unknown' | 'expired'

export interface Place {
  name: string
  lat: number
  lon: number
}

export interface Settings {
  workStart: Hhmm
  workEnd: Hhmm
  bed: Hhmm
  wake: Hhmm
  place: Place | null
  notify: { n1: boolean; n2: boolean; n3: boolean }
  /** 朝型・夜型。未回答なら「どちらでもない」として計算する */
  chronotype?: Chronotype
  /** 未回答なら undefined */
  sex?: Sex
  /** 最終月経の開始日（YYYY-MM-DD）。女性を選んだ人だけ */
  lastPeriod?: string | null
  /** 月経周期の日数 */
  cycleLength?: number
}

export interface Checkin {
  bed: Hhmm
  wake: Hhmm
  sleepQ: Level
  cond: Level
  symptoms: string[]
  aircon: Aircon
  /** 冷暖房の設定温度（℃）。aircon が none のときは使わない */
  acTemp: number
  skipped: boolean
  /** チェックインで「今日から月経」を選んだ */
  periodStarted?: boolean
  /** periodStarted で上書きする前の最終月経の開始日（取り消し用） */
  prevLastPeriod?: string | null
}

export interface LogEvent {
  type: LogType
  /** その日の 0 時からの時間（小数） */
  at: number
  symptoms?: string[]
  /** 休憩の長さ（分）。休憩の記録だけに付く */
  minutes?: number
}

export interface Remedy {
  cause: CauseKey
  action: string
  at: number
  result: RemedyResult | null
}

/** 時間別の天気（0〜23 時の 24 要素） */
export interface HourlyWeather {
  temp: number[]
  rh: number[]
  pressure: number[]
  radiation: number[]
  cloud: number[]
}

export interface DayInput {
  settings: Settings
  checkin: Checkin
  logs: LogEvent[]
  weather: HourlyWeather
  /** 月経周期。記録していない人は null */
  cycle?: CycleInfo | null
}

export type CauseKey =
  | 'sleep'
  | 'lunch'
  | 'vent'
  | 'sun'
  | 'dry'
  | 'temp'
  | 'break'
  | 'press'
  | 'meeting'
  | 'task'
