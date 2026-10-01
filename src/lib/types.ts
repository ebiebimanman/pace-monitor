/** "HH:MM" 形式の時刻 */
export type Hhmm = string

export type Level = 1 | 2 | 3
export type Aircon = 'heat' | 'cool' | 'none'
export type LogType = 'window' | 'break' | 'water' | 'slump'
export type RemedyResult = 'better' | 'same' | 'unknown' | 'expired'

export interface Place {
  name: string
  lat: number
  lon: number
}

export interface Settings {
  workStart: Hhmm
  workEnd: Hhmm
  lunchStart: Hhmm
  lunchEnd: Hhmm
  bed: Hhmm
  wake: Hhmm
  place: Place | null
  notify: { n1: boolean; n2: boolean; n3: boolean }
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
}

export interface LogEvent {
  type: LogType
  /** その日の 0 時からの時間（小数） */
  at: number
  symptoms?: string[]
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
  | 'task'
