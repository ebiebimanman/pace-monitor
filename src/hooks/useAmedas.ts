import { useEffect, useState } from 'react'
import type { Place } from '../lib/types'
import { fetchObservation, fetchStation, type Observation, type Station } from '../lib/amedas'
import { load, save } from '../lib/storage'

interface StationCache {
  key: string
  station: Station | null
}

export interface Amedas {
  station: Station
  obs: Observation
}

const POLL = 10 * 60 * 1000

/** 近くのアメダスの最新の気温。10 分ごとに取り直す。取れなければ null（予報だけで計算する） */
export function useAmedas(place: Place | null, date: string): Amedas | null {
  const [state, setState] = useState<Amedas | null>(null)
  const lat = place?.lat
  const lon = place?.lon

  useEffect(() => {
    setState(null)
    if (lat === undefined || lon === undefined) return
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`
    let cancelled = false
    const run = async () => {
      try {
        // 観測点の一覧は大きいので、場所ごとに選んだ結果だけ覚えておく
        const cached = load<StationCache | null>('amedasStation', null)
        let station = cached?.key === key ? cached.station : undefined
        if (station === undefined) {
          station = await fetchStation({ name: '', lat, lon })
          save<StationCache>('amedasStation', { key, station })
        }
        if (!station) return
        const obs = await fetchObservation(station.code, date)
        if (!cancelled) setState(obs ? { station, obs } : null)
      } catch {
        // 取れなかったときは前の値を使い続ける
      }
    }
    run()
    const id = setInterval(run, POLL)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [lat, lon, date])

  return state
}
