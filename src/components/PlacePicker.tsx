import { useState } from 'react'
import type { Place } from '../lib/types'
import { placeNameAt, searchPlaces } from '../lib/weather'

interface Props {
  value: Place | null
  onChange: (place: Place) => void
}

/** 市区町村の検索、または現在地で場所を決める */
export function PlacePicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value && value.name !== '現在地' ? value.name : '')
  const [results, setResults] = useState<Place[] | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setBusy(true)
    setNote('')
    try {
      const r = await searchPlaces(query.trim())
      setResults(r)
      if (!r.length) setNote('見つかりませんでした。「狭山市」のように市区町村名で検索してください')
    } catch (e) {
      setNote(e instanceof Error ? e.message : '検索できませんでした')
    } finally {
      setBusy(false)
    }
  }

  const useCurrent = () => {
    if (!('geolocation' in navigator)) {
      setNote('このブラウザでは現在地を取得できません。市区町村名で検索してください')
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        const name = await placeNameAt(lat, lon)
        setBusy(false)
        onChange({ name: name ?? '現在地', lat, lon })
        setQuery(name ?? '')
        setResults(null)
        setNote(name ? '' : '現在地は取得できましたが、地名を調べられませんでした。天気は現在地のものを使います')
      },
      () => {
        setBusy(false)
        setNote('現在地を取得できませんでした。市区町村名で検索してください')
      },
      { timeout: 10_000 },
    )
  }

  return (
    <div className="field">
      <span className="lbl">場所{value && <span className="quiet">　設定中：{value.name}</span>}</span>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
      >
        <input
          type="text"
          id="place-query"
          aria-label="市区町村名"
          placeholder="市区町村名（例：狭山市）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn sec" disabled={busy}>
          検索
        </button>
        <button type="button" className="btn sec" onClick={useCurrent} disabled={busy}>
          現在地を使う
        </button>
      </form>
      {results && results.length > 0 && (
        <div className="chips" role="group" aria-label="検索結果">
          {results.map((p) => (
            <button
              key={`${p.lat},${p.lon}`}
              type="button"
              className="chip"
              aria-pressed={value?.lat === p.lat && value?.lon === p.lon}
              onClick={() => {
                onChange(p)
                setQuery(p.name)
                setResults(null)
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      {note && <span className="quiet">{note}</span>}
    </div>
  )
}
