import type { HourlyWeather, Place } from './types'
import { clamp } from './time'
import { weatherAt } from './weather'

const BASE = 'https://www.jma.go.jp/bosai/amedas'
/** これより遠い観測点しかないときは、実測を使わない */
const MAX_KM = 30
/** 実測と予報の差を、観測時刻から何時間かけて 0 に戻すか */
export const FADE_HOURS = 4

export interface Station {
  code: string
  name: string
  km: number
}

export interface Observation {
  /** 観測時刻（その日の 0 時からの時間） */
  at: number
  temp: number
}

export interface StationEntry {
  /** 観測要素。先頭が '1' なら気温を測っている */
  elems: string
  lat: [number, number]
  lon: [number, number]
  kjName: string
}

/** 気温を測っている観測点のうち、いちばん近いもの */
export function nearestStation(table: Record<string, StationEntry>, lat: number, lon: number): Station | null {
  let best: Station | null = null
  for (const [code, s] of Object.entries(table)) {
    if (s.elems[0] !== '1') continue
    const la = s.lat[0] + s.lat[1] / 60
    const lo = s.lon[0] + s.lon[1] / 60
    // 数十 km の範囲なので平面で近似する
    const km = Math.hypot((la - lat) * 111, (lo - lon) * 111 * Math.cos((lat * Math.PI) / 180))
    if (!best || km < best.km) best = { code, name: s.kjName, km }
  }
  return best && best.km <= MAX_KM ? best : null
}

/** 設定した場所にいちばん近いアメダスの観測点 */
export async function fetchStation(place: Place): Promise<Station | null> {
  const res = await fetch(`${BASE}/const/amedastable.json`)
  if (!res.ok) throw new Error(`アメダスの観測点を取得できませんでした（${res.status}）`)
  return nearestStation(await res.json(), place.lat, place.lon)
}

type PointData = Record<string, { temp?: [number | null, number] }>

/** 3 時間分の観測データから、いちばん新しい気温を取り出す（キーは YYYYMMDDHHmmss、日本時間） */
export function latestTemp(data: PointData): Observation | null {
  for (const key of Object.keys(data).sort().reverse()) {
    const t = data[key].temp
    // 2 つ目は品質フラグ。0 が正常
    if (t && t[0] !== null && t[1] === 0) return { at: Number(key.slice(8, 10)) + Number(key.slice(10, 12)) / 60, temp: t[0] }
  }
  return null
}

/** 観測点の今日の最新の気温。日付が変わったばかりなどで今日の値がなければ null */
export async function fetchObservation(code: string, date: string): Promise<Observation | null> {
  const latest = await fetch(`${BASE}/data/latest_time.txt`)
  if (!latest.ok) throw new Error(`アメダスの観測時刻を取得できませんでした（${latest.status}）`)
  // 例：2026-10-06T16:20:00+09:00
  const time = (await latest.text()).trim()
  if (time.slice(0, 10) !== date) return null
  const block = String(Math.floor(Number(time.slice(11, 13)) / 3) * 3).padStart(2, '0')
  const res = await fetch(`${BASE}/data/point/${code}/${date.replaceAll('-', '')}_${block}.json`)
  if (!res.ok) throw new Error(`アメダスの気温を取得できませんでした（${res.status}）`)
  return latestTemp(await res.json())
}

/** 実測と予報の差を予報の気温に足す。観測時刻までは差をそのまま、その後は FADE_HOURS かけて 0 に戻す */
export function applyObservation(w: HourlyWeather, obs: Observation): HourlyWeather {
  const diff = obs.temp - weatherAt(w, 'temp', obs.at)
  return { ...w, temp: w.temp.map((v, h) => v + diff * clamp(1 - (h - obs.at) / FADE_HOURS, 0, 1)) }
}
