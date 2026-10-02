import { useState } from 'react'
import type { LogEvent } from '../lib/types'
import { BREAK_MINUTES, RECORD_LABEL, type RecordType } from '../lib/records'
import { fmt, toHours } from '../lib/time'
import { Modal } from './Modal'

interface Props {
  record: LogEvent & { type: RecordType }
  now: number
  onSave: (next: LogEvent) => void
  onDelete: () => void
  onClose: () => void
}

const toHhmm = (h: number) => fmt(h).padStart(5, '0')

/** グラフのアイコンから開く。あとから入れた記録の時刻を直す */
export function RecordEditModal({ record, now, onSave, onDelete, onClose }: Props) {
  const [time, setTime] = useState(toHhmm(record.at))
  const [minutes, setMinutes] = useState(record.minutes)
  const at = time ? toHours(time) : NaN
  const future = at > now
  const label = RECORD_LABEL[record.type]

  return (
    <Modal label={`${label}の記録を編集`} onClose={onClose}>
      <h3>{label}の記録</h3>
      <div className="field">
        <label className="lbl" htmlFor="rec-time">
          {record.type === 'break' ? '休憩を始めた時刻' : '時刻'}
        </label>
        <div className="row">
          <input type="time" id="rec-time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        {future && <span className="quiet warn-text">いまより後の時刻は入れられません</span>}
      </div>
      {record.type === 'break' && (
        <div className="field">
          <span className="lbl">休憩の長さ</span>
          <div className="chips">
            {BREAK_MINUTES.map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                {m}分
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="actions">
        <button type="button" className="btn sec" onClick={onDelete}>
          削除
        </button>
        <button type="button" className="btn sec" onClick={onClose}>
          閉じる
        </button>
        <button
          type="button"
          className="btn"
          disabled={Number.isNaN(at) || future}
          onClick={() => onSave(minutes === undefined ? { ...record, at } : { ...record, at, minutes })}
        >
          保存
        </button>
      </div>
    </Modal>
  )
}
