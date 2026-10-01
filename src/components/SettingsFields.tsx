import { useState } from 'react'
import type { Settings } from '../lib/types'

type Patch = (p: Partial<Settings>) => void

export function WorkFields({ s, set }: { s: Settings; set: Patch }) {
  return (
    <>
      <div className="field">
        <span className="lbl">仕事する時間</span>
        <div className="row">
          <input type="time" id="set-ws" aria-label="仕事の開始" step={900} value={s.workStart} onChange={(e) => set({ workStart: e.target.value })} />
          〜
          <input type="time" id="set-we" aria-label="仕事の終了" step={900} value={s.workEnd} onChange={(e) => set({ workEnd: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <span className="lbl">いつもの昼休み</span>
        <div className="row">
          <input type="time" id="set-ls" aria-label="昼休みの開始" value={s.lunchStart} onChange={(e) => set({ lunchStart: e.target.value })} />
          〜
          <input type="time" id="set-le" aria-label="昼休みの終了" value={s.lunchEnd} onChange={(e) => set({ lunchEnd: e.target.value })} />
        </div>
        <span className="quiet">食後に集中が落ちる時間の予測に使います</span>
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
  ['n1', 'ペースダウン時間の5分前', '軽めの作業に切り替える合図'],
  ['n2', 'チェックインのリマインド', '仕事開始を過ぎても未回答のとき1回だけ'],
  ['n3', '換気・休憩のひとこと', 'ペースダウン時間中だけ'],
]

export function NotifyFields({ s, set }: { s: Settings; set: Patch }) {
  const supported = typeof Notification !== 'undefined'
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied')
  return (
    <div className="field">
      <span className="lbl">通知</span>
      <span className="quiet">このタブを開いている間だけ届きます。集中している時間には出しません。</span>
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
