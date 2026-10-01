import { useState } from 'react'
import type { Aircon, Checkin, Level } from '../lib/types'
import { clamp, formatDuration, sleepHours } from '../lib/time'
import { Face } from './icons'
import { Modal } from './Modal'

const SYMPTOMS = ['頭痛', '頭が重い', '目が疲れてる', 'だるい', '肩・首こり', '鼻・のど']
const AIRCON: [Aircon, string][] = [
  ['heat', '暖房'],
  ['cool', '冷房'],
  ['none', '使わない'],
]

interface Props {
  /** 編集時は今日の回答、新規時はいつもの時刻などを入れた初期値 */
  initial: Checkin
  editing: boolean
  onSave: (c: Checkin) => void
  onLater: () => void
  onClose: () => void
}

export function CheckinModal({ initial, editing, onSave, onLater, onClose }: Props) {
  const [bed, setBed] = useState(initial.bed)
  const [wake, setWake] = useState(initial.wake)
  const [sleepQ, setSleepQ] = useState<Level | 0>(editing ? initial.sleepQ : 0)
  const [cond, setCond] = useState<Level | 0>(editing ? initial.cond : 0)
  const [symptoms, setSymptoms] = useState<string[]>(editing ? initial.symptoms : [])
  const [aircon, setAircon] = useState<Aircon>(initial.aircon)
  const [acTemp, setAcTemp] = useState(initial.acTemp)
  const [showSym, setShowSym] = useState(editing && (initial.cond > 1 || initial.symptoms.length > 0))

  const ready = sleepQ !== 0 && cond !== 0

  return (
    <Modal label={editing ? 'チェックインを編集' : '朝のチェックイン'} onClose={onClose}>
      <h3>{editing ? 'チェックインを編集' : 'おはようございます'}</h3>
      <p className="lead">
        {editing ? '今日の回答を変えると、コンディションと曲線を計算し直します。' : '30秒で、今日のコンディションを計算します。'}
      </p>

      <div className="field">
        <span className="lbl">寝た時刻・起きた時刻</span>
        <div className="row">
          <input type="time" id="ci-bed" aria-label="寝た時刻" value={bed} onChange={(e) => setBed(e.target.value)} />
          →
          <input type="time" id="ci-wake" aria-label="起きた時刻" value={wake} onChange={(e) => setWake(e.target.value)} />
          <span className="quiet">睡眠 {formatDuration(sleepHours(bed, wake))}</span>
        </div>
      </div>

      <div className="field">
        <span className="lbl">睡眠の質</span>
        <Faces value={sleepQ} labels={['よく眠れた', 'ふつう', 'いまいち']} onChange={setSleepQ} />
      </div>

      <div className="field">
        <span className="lbl">今の体調</span>
        <Faces
          value={cond}
          labels={['いい', 'ふつう', 'いまいち']}
          onChange={(v) => {
            setCond(v)
            if (v > 1) setShowSym(true)
          }}
        />
        {!showSym && (
          <button type="button" className="link" onClick={() => setShowSym(true)}>
            症状を追加
          </button>
        )}
        {showSym && (
          <div>
            <span className="quiet">気になる症状（任意・複数可）</span>
            <div className="chips" style={{ marginTop: 6 }}>
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  aria-pressed={symptoms.includes(s)}
                  onClick={() => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="field">
        <span className="lbl">今日の冷暖房</span>
        <div className="row">
          <span className="seg" role="group" aria-label="今日の冷暖房">
            {AIRCON.map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={aircon === k}
                onClick={() => {
                  if (k !== aircon && k !== 'none') setAcTemp(k === 'heat' ? 21 : 26)
                  setAircon(k)
                }}
              >
                {l}
              </button>
            ))}
          </span>
          {aircon !== 'none' && (
            <span className="row" style={{ gap: 6 }}>
              <span className="quiet">設定温度</span>
              <span className="tstep">
                <button type="button" aria-label="設定温度を下げる" onClick={() => setAcTemp((t) => clamp(t - 0.5, 16, 30))}>
                  −
                </button>
                <span>{acTemp.toFixed(1)}℃</span>
                <button type="button" aria-label="設定温度を上げる" onClick={() => setAcTemp((t) => clamp(t + 0.5, 16, 30))}>
                  ＋
                </button>
              </span>
            </span>
          )}
        </div>
        <span className="quiet">室内の湿度の推定に使います。ホームでも変更できます</span>
      </div>

      <div className="actions">
        <button type="button" className="btn sec" onClick={editing ? onClose : onLater}>
          {editing ? 'キャンセル' : 'あとで'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!ready}
          onClick={() =>
            ready && onSave({ bed, wake, sleepQ, cond, symptoms, aircon, acTemp, skipped: false })
          }
        >
          {editing ? '保存する' : '今日をはじめる'}
        </button>
      </div>
    </Modal>
  )
}

function Faces({ value, labels, onChange }: { value: Level | 0; labels: string[]; onChange: (v: Level) => void }) {
  return (
    <div className="faces" role="group">
      {([1, 2, 3] as const).map((l) => (
        <button key={l} type="button" className="face" aria-pressed={value === l} onClick={() => onChange(l)}>
          <Face level={l} />
          {labels[l - 1]}
        </button>
      ))}
    </div>
  )
}
