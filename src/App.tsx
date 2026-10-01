import { useEffect, useMemo, useState } from 'react'
import type { Checkin, HourlyWeather, Settings } from './lib/types'
import { computeCurve, computeHero, findZones, heroComment, zoneText } from './lib/condition'
import { fetchHourlyWeather } from './lib/weather'
import { load, todayKey } from './lib/storage'
import { fmt } from './lib/time'

// 画面はプロトタイプからの移植待ち。今はロジックと天気取得がつながっていることを確認するための仮表示。
const DEFAULT_SETTINGS: Settings = {
  workStart: '09:00',
  workEnd: '18:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  bed: '00:00',
  wake: '07:00',
  place: { name: '埼玉県狭山市', lat: 35.853, lon: 139.412 },
  notify: { n1: true, n2: true, n3: false },
}

const DEFAULT_CHECKIN: Checkin = {
  bed: '00:00',
  wake: '07:00',
  sleepQ: 2,
  cond: 2,
  symptoms: [],
  aircon: 'none',
  acTemp: 26,
  skipped: true,
}

export default function App() {
  const [settings] = useState(() => load('settings', DEFAULT_SETTINGS))
  const [weather, setWeather] = useState<HourlyWeather | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!settings.place) return
    fetchHourlyWeather(settings.place, todayKey())
      .then(setWeather)
      .catch((e: Error) => setError(e.message))
  }, [settings.place])

  const result = useMemo(() => {
    if (!weather) return null
    const day = { settings, checkin: DEFAULT_CHECKIN, logs: [], weather }
    const hero = computeHero(day)
    const curve = computeCurve(day, hero)
    return { day, hero, zones: findZones(day, hero, curve) }
  }, [weather, settings])

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontFamily: 'var(--f-display)' }}>ペース予報</h1>
      <p>{settings.place?.name}</p>
      {error && <p role="alert">{error}</p>}
      {!result && !error && <p>天気を読み込んでいます…</p>}
      {result && (
        <>
          <p style={{ fontSize: 48, fontFamily: 'var(--f-display)', margin: 0 }}>{result.hero.value}%</p>
          <p>{heroComment(result.hero.value)}</p>
          <ul>
            {result.zones.map((z) => {
              const text = zoneText(result.day, z, result.hero.sleep)
              return (
                <li key={z.start}>
                  {fmt(z.start)}–{fmt(z.end)} {z.strong ? 'ペースダウン' : 'ややペースダウン'}（{text.name}）
                </li>
              )
            })}
          </ul>
        </>
      )}
    </main>
  )
}
