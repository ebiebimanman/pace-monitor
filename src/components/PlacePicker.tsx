import { useState } from 'react'
import type { Place } from '../lib/types'
import { searchPlaces } from '../lib/weather'

interface Props {
  value: Place | null
  onChange: (place: Place) => void
}

/** 市区町村の検索、または現在地で場所を決める */
export function PlacePicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
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
      if (!r.length) setNote('見つかりませんでした。市区町村名で試してください（例：狭山市）')
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
      (pos) => {
        setBusy(false)
        onChange({ name: '現在地', lat: pos.coords.latitude, lon: pos.coords.longitude })
        setResults(null)
        setNote('')
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
      <span className="lbl">場所{value && <span className="quiet">　いま：{value.name}</span>}</span>
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
