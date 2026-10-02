import type { HourlyWeather, Place } from './types'
import { clamp } from './time'

type WeatherKey = keyof HourlyWeather

/** 時間別の値を線形補間して、任意の時刻の値を返す */
export function weatherAt(w: HourlyWeather, key: WeatherKey, t: number): number {
  const tt = clamp(t, 0, 23)
  const i = Math.floor(tt)
  const f = tt - i
  const a = w[key]
  return a[i] * (1 - f) + a[Math.min(23, i + 1)] * f
}

/** 前後 1.5 時間での気圧の低下量（hPa、下がると正） */
export function pressureDrop(w: HourlyWeather, t: number): number {
  return weatherAt(w, 'pressure', t - 1.5) - weatherAt(w, 'pressure', t + 1.5)
}

interface ForecastResponse {
  hourly: {
    time: string[]
    temperature_2m: number[]
    relative_humidity_2m: number[]
    pressure_msl: number[]
    shortwave_radiation: number[]
    cloud_cover: number[]
  }
}

/** Open-Meteo から指定日（YYYY-MM-DD、日本時間）の時間別予報を取得する */
export async function fetchHourlyWeather(place: Place, date: string): Promise<HourlyWeather> {
  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    hourly: 'temperature_2m,relative_humidity_2m,pressure_msl,shortwave_radiation,cloud_cover',
    timezone: 'Asia/Tokyo',
    start_date: date,
    end_date: date,
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`天気を取得できませんでした（${res.status}）`)
  const { hourly } = (await res.json()) as ForecastResponse
  return {
    temp: hourly.temperature_2m,
    rh: hourly.relative_humidity_2m,
    pressure: hourly.pressure_msl,
    radiation: hourly.shortwave_radiation,
    cloud: hourly.cloud_cover,
  }
}

interface GeocodingResponse {
  results?: { name: string; latitude: number; longitude: number; admin1?: string }[]
}

/** 市区町村名から候補を探す（国内のみ） */
interface ReverseResponse {
  address?: { province?: string; state?: string; city?: string; town?: string; village?: string }
}

/** 緯度経度から「埼玉県狭山市」のような名前を引く（OpenStreetMap Nominatim）。引けなければ null */
export async function placeNameAt(lat: number, lon: number): Promise<string | null> {
  const params = new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lon), zoom: '10', 'accept-language': 'ja' })
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`)
    if (!res.ok) return null
    const { address } = (await res.json()) as ReverseResponse
    if (!address) return null
    const pref = address.province ?? address.state ?? ''
    const city = address.city ?? address.town ?? address.village ?? ''
    return pref + city || null
  } catch {
    return null
  }
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const params = new URLSearchParams({ name: query, count: '5', language: 'ja', countryCode: 'JP' })
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`)
  if (!res.ok) throw new Error(`場所を検索できませんでした（${res.status}）`)
  const { results = [] } = (await res.json()) as GeocodingResponse
  return results.map((r) => ({
    name: r.admin1 && r.admin1 !== r.name ? `${r.admin1}${r.name}` : r.name,
    lat: r.latitude,
    lon: r.longitude,
  }))
}
