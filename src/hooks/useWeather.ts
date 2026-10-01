import { useEffect, useState } from 'react'
import type { HourlyWeather, Place } from '../lib/types'
import { fetchHourlyWeather } from '../lib/weather'
import { load, save } from '../lib/storage'

interface Cache {
  key: string
  fetchedAt: number
  data: HourlyWeather
}

const HOUR = 60 * 60 * 1000

/** 場所が決まっていないときに使う、影響の出ない天気 */
export const NEUTRAL_WEATHER: HourlyWeather = {
  temp: Array(24).fill(22),
  rh: Array(24).fill(50),
  pressure: Array(24).fill(1013),
  radiation: Array(24).fill(0),
  cloud: Array(24).fill(50),
}

export type WeatherState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; data: HourlyWeather }
  | { status: 'error'; message: string; data?: HourlyWeather }

/** 時間別の天気。1 時間ごとに取り直し、取得結果は localStorage にキャッシュする */
export function useWeather(place: Place | null, date: string): WeatherState {
  const key = place ? `${place.lat.toFixed(3)},${place.lon.toFixed(3)},${date}` : ''
  const [state, setState] = useState<WeatherState>(() => {
    const c = load<Cache | null>('weatherCache', null)
    return c && c.key === key ? { status: 'ready', data: c.data } : place ? { status: 'loading' } : { status: 'none' }
  })

  const lat = place?.lat
  const lon = place?.lon
  useEffect(() => {
    if (lat === undefined || lon === undefined) return
    let cancelled = false
    const run = async () => {
      const c = load<Cache | null>('weatherCache', null)
      if (c && c.key === key) {
        setState({ status: 'ready', data: c.data })
        if (Date.now() - c.fetchedAt < HOUR) return
      } else {
        setState({ status: 'loading' })
      }
      try {
        const data = await fetchHourlyWeather({ name: '', lat, lon }, date)
        if (cancelled) return
        save<Cache>('weatherCache', { key, fetchedAt: Date.now(), data })
        setState({ status: 'ready', data })
      } catch (e) {
        if (cancelled) return
        const message = e instanceof Error ? e.message : '天気を取得できませんでした'
        setState((prev) => ({ status: 'error', message, data: prev.status === 'ready' ? prev.data : c?.data }))
      }
    }
    run()
    const id = setInterval(run, HOUR)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [key, lat, lon, date])

  if (!place) return { status: 'none' }
  return state
}
