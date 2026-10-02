import { useState } from 'react'
import { SYMPTOMS, type Suggestion } from '../lib/causes'
import { fmt } from '../lib/time'
import { Modal } from './Modal'

interface Props {
  now: number
  /** 症状を決めたときに呼ぶ。記録を残し、候補を返す */
  onSymptoms: (symptoms: string[]) => Suggestion[]
  /** 「やってみる」の切り替え。true で追加、false で取り消し */
  onTry: (s: Suggestion, on: boolean) => void
  onClose: (tried: number) => void
}

export function SlumpModal({ now, onSymptoms, onTry, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [tried, setTried] = useState<string[]>([])
  const close = () => onClose(tried.length)

  if (!suggestions) {
    return (
      <Modal label="集中切れた" onClose={close}>
        <h3>どんな感じ？</h3>
        <p className="lead">当てはまるものをすべて選んでください。</p>
        <div className="chips">
          {SYMPTOMS.map((s) => (
            <button
              key={s}
              type="button"
              className="chip lg"
              aria-pressed={selected.includes(s)}
              onClick={() => setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="actions">
          <button type="button" className="btn sec" onClick={close}>
            閉じる
          </button>
          <button type="button" className="btn" disabled={!selected.length} onClick={() => setSuggestions(onSymptoms(selected))}>
            原因を見る
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal label="やってみよう" onClose={close}>
      <h3>やってみよう</h3>
      <p className="lead">
        {selected.join('・')}（{fmt(now)}）。今の状況に合いそうな対処から順に並べました。いくつ試してもかまいません。
      </p>
      {suggestions.map((s) => {
        const on = tried.includes(s.cause)
        return (
          <div className={`cause${on ? ' on' : ''}`} key={s.cause}>
            <p className="do">{s.action}</p>
            <p className="why">
              <span className="cz">原因：{s.name}</span>
              <span className="dots" aria-label={`当てはまりそうな度合い ${s.confidence}/3`}>
                {'●'.repeat(s.confidence)}
                <span className="off">{'●'.repeat(3 - s.confidence)}</span>
              </span>
              <br />
              {s.reason}
            </p>
            <button
              type="button"
              className="btn"
              aria-pressed={on}
              onClick={() => {
                onTry(s, !on)
                setTried((cur) => (on ? cur.filter((c) => c !== s.cause) : [...cur, s.cause]))
              }}
            >
              {on ? 'やる予定・押すと取り消し' : 'やってみる'}
            </button>
          </div>
        )
      })}
      <div className="actions">
        {!tried.length && (
          <button type="button" className="btn sec" onClick={close}>
            どれも違う
          </button>
        )}
        <button type="button" className="btn" onClick={close}>
          閉じる
        </button>
      </div>
    </Modal>
  )
}
