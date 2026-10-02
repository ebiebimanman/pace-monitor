import { useState } from 'react'
import type { Settings, Sex } from '../lib/types'
import { DEFAULT_CYCLE } from '../lib/cycle'
import { todayKey } from '../lib/storage'

type Patch = (p: Partial<Settings>) => void

export function WorkFields({ s, set }: { s: Settings; set: Patch }) {
  return (
    <>
      <div className="field">
        <span className="lbl">仕事の時間</span>
        <div className="row">
          <input type="time" id="set-ws" aria-label="仕事の開始" step={900} value={s.workStart} onChange={(e) => set({ workStart: e.target.value })} />
          〜
          <input type="time" id="set-we" aria-label="仕事の終了" step={900} value={s.workEnd} onChange={(e) => set({ workEnd: e.target.value })} />
        </div>
        {s.workEnd <= s.workStart && <span className="quiet warn-text">終了は開始より後の時刻にしてください</span>}
      </div>
    </>
  )
}

export function SleepFields({ s, set }: { s: Settings; set: Patch }) {
  return (
    <div className="field">
      <span className="lbl">いつもの就寝・起床時刻</span>
      <div className="row">
        <label htmlFor="set-bed">就寝</label>
        <input type="time" id="set-bed" value={s.bed} onChange={(e) => set({ bed: e.target.value })} />
        <label htmlFor="set-wake">起床</label>
        <input type="time" id="set-wake" value={s.wake} onChange={(e) => set({ wake: e.target.value })} />
      </div>
    </div>
  )
}

const NOTIFY: [keyof Settings['notify'], string, string][] = [
  ['n1', 'ペースダウン時間の5分前', '軽い作業に切り替える時間をお知らせします'],
  ['n2', 'チェックインのリマインド', '仕事の開始時刻を過ぎてもチェックインしていないとき、1回だけお知らせします'],
  ['n3', '換気・休憩のおすすめ', 'ペースダウン時間の間だけお知らせします'],
]

export function NotifyFields({ s, set }: { s: Settings; set: Patch }) {
  const supported = typeof Notification !== 'undefined'
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied')
  return (
    <div className="field">
      <span className="lbl">通知</span>
      <span className="quiet">通知は、このタブを開いている間だけ届きます。集中できている時間帯には送りません。</span>
      {NOTIFY.map(([k, label, sub]) => (
        <div className="toggle" key={k}>
          <label htmlFor={`set-${k}`}>
            {label}
            <small>{sub}</small>
          </label>
          <input
            type="checkbox"
            id={`set-${k}`}
            checked={s.notify[k]}
            onChange={(e) => set({ notify: { ...s.notify, [k]: e.target.checked } })}
          />
        </div>
      ))}
      {!supported && <span className="quiet">このブラウザは通知に対応していません。</span>}
      {supported && permission === 'default' && (
        <button type="button" className="btn sec" onClick={() => Notification.requestPermission().then(setPermission)}>
          ブラウザの通知を許可する
        </button>
      )}
      {supported && permission === 'denied' && (
        <span className="quiet">ブラウザで通知がブロックされています。サイトの設定から許可してください。</span>
      )}
    </div>
  )
}

const SEX: [Sex, string][] = [
  ['female', '女性'],
  ['male', '男性'],
]

export function BodyFields({ s, set }: { s: Settings; set: Patch }) {
  return (
    <>
      <div className="field">
        <span className="lbl">生物学的な性別</span>
        <span className="seg" role="group" aria-label="生物学的な性別">
          {SEX.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={s.sex === k} onClick={() => set({ sex: k })}>
              {l}
            </button>
          ))}
        </span>
      </div>
      {s.sex === 'female' && (
        <div className="field">
          <span className="lbl">最終月経</span>
          <div className="row">
            <label htmlFor="set-lp">始まった日</label>
            <input type="date" id="set-lp" max={todayKey()} value={s.lastPeriod ?? ''} onChange={(e) => set({ lastPeriod: e.target.value || null })} />
            <label htmlFor="set-cl">周期</label>
            <input
              type="number"
              id="set-cl"
              min={20}
              max={45}
              value={s.cycleLength ?? DEFAULT_CYCLE}
              onChange={(e) => set({ cycleLength: Number(e.target.value) || DEFAULT_CYCLE })}
            />
            日
          </div>
          <span className="quiet">月経中と月経前の数日は、コンディションを低めに予報します。周期がわからなければ28日のままで大丈夫です。次に始まったら、朝のチェックインで記録できます。</span>
        </div>
      )}
    </>
  )
}
