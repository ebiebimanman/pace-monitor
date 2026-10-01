import type { Aircon, DayInput } from '../lib/types'
import { hoursSince } from '../lib/condition'
import { humidityLabel, indoorHumidity } from '../lib/humidity'
import { weatherAt } from '../lib/weather'
import { formatDuration, toHours } from '../lib/time'
import { RecordIcon } from './icons'
import type { RecordType } from '../lib/records'

interface Props {
  day: DayInput
  now: number
  weatherNote: string | null
  onAircon: (aircon: Aircon) => void
  onTemp: (delta: number) => void
  onRecord: (type: RecordType) => void
}

const AIRCON: [Aircon, string][] = [
  ['heat', '暖房'],
  ['cool', '冷房'],
  ['none', 'なし'],
]
const TAPS: [RecordType, string][] = [
  ['window', '窓開けた'],
  ['break', '休憩した'],
  ['water', '水飲んだ'],
]

export function StatusPanel({ day, now, weatherNote, onAircon, onTemp, onRecord }: Props) {
  const { weather: w, checkin: c, logs } = day
  const temp = weatherAt(w, 'temp', now)
  const p = weatherAt(w, 'pressure', now)
  const dp = weatherAt(w, 'pressure', now + 3) - p
  const cloud = weatherAt(w, 'cloud', now)
  const sky = cloud < 40 ? '晴れ' : cloud < 70 ? 'くもり時々晴れ' : 'くもり'
  const rh = indoorHumidity(w, now, c.aircon, c.acTemp)
  const rhLabel = humidityLabel(rh)
  const workStart = toHours(day.settings.workStart)
  const vent = hoursSince(logs, 'window', now, workStart)
  const brk = hoursSince(logs, 'break', now, workStart)
  const hasVent = logs.some((e) => e.type === 'window' && e.at <= now)
  const hasBreak = logs.some((e) => e.type === 'break' && e.at <= now)
  // 記録がない間も、計算上は仕事開始から数えている
  const since = (has: boolean, h: number) => (has ? formatDuration(h) : now >= workStart ? `記録なし（${formatDuration(h)}）` : '記録なし')
  const acNote = c.aircon === 'heat' ? '（暖房時の推定）' : c.aircon === 'cool' ? '（冷房時の推定）' : ''

  return (
    <section className="panel" aria-labelledby="stH">
      <h2 id="stH">今の状態</h2>
      <ul className="stat">
        <li>
          <span className="k">天気</span>
          {weatherNote ? (
            <span className="v">{weatherNote}</span>
          ) : (
            <span className="v">
              {sky} {temp.toFixed(0)}℃ / {p.toFixed(0)}hPa {dp < 0 ? '↓' : '↑'}
              {Math.abs(dp).toFixed(1)}
              <br />
              <span className="label">3時間後</span>
            </span>
          )}
        </li>
        <li>
          <span className="k">室内の湿度</span>
          <span className={`v${rhLabel ? ' warn' : ''}`}>
            約{Math.round(rh)}%{acNote}
            {rhLabel && (
              <>
                <br />
                {rhLabel}
              </>
            )}
          </span>
        </li>
        <li>
          <span className="k">冷暖房</span>
          <span className="row end">
            <span className="seg" role="group" aria-label="冷暖房">
              {AIRCON.map(([k, l]) => (
                <button key={k} type="button" aria-pressed={c.aircon === k} onClick={() => onAircon(k)}>
                  {l}
                </button>
              ))}
            </span>
            {c.aircon !== 'none' && (
              <span className="tstep">
                <button type="button" aria-label="設定温度を下げる" onClick={() => onTemp(-0.5)}>
                  −
                </button>
                <span>{c.acTemp.toFixed(1)}℃</span>
                <button type="button" aria-label="設定温度を上げる" onClick={() => onTemp(0.5)}>
                  ＋
                </button>
              </span>
            )}
          </span>
        </li>
        <li>
          <span className="k">換気から</span>
          <span className={`v${vent > 1.5 ? ' warn' : ''}`}>{since(hasVent, vent)}</span>
        </li>
        <li>
          <span className="k">休憩から</span>
          <span className={`v${brk > 2 ? ' warn' : ''}`}>{since(hasBreak, brk)}</span>
        </li>
      </ul>
      <div className="taps">
        {TAPS.map(([k, l]) => (
          <button key={k} type="button" className="tap" onClick={() => onRecord(k)}>
            <RecordIcon type={k} />
            {l}
          </button>
        ))}
      </div>
    </section>
  )
}
