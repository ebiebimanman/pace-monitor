import { useState } from 'react'
import type { Settings } from '../lib/types'
import { Modal } from './Modal'
import { PlacePicker } from './PlacePicker'
import { NotifyFields, SleepFields, WorkFields } from './SettingsFields'

interface Props {
  settings: Settings
  exportData: () => string
  onSave: (s: Settings) => void
  onDeleteAll: () => void
  onClose: () => void
  toast: (text: string) => void
}

export function SettingsModal({ settings, exportData, onSave, onDeleteAll, onClose, toast }: Props) {
  const [s, setS] = useState(settings)
  const [confirming, setConfirming] = useState(false)
  const set = (p: Partial<Settings>) => setS((cur) => ({ ...cur, ...p }))

  return (
    <Modal label="設定" onClose={onClose}>
      <h3>設定</h3>
      <p className="lead">冷暖房は、毎朝のチェックインとホームで変更します。</p>
      <WorkFields s={s} set={set} />
      <SleepFields s={s} set={set} />
      <PlacePicker value={s.place} onChange={(place) => set({ place })} />
      <NotifyFields s={s} set={set} />

      <div className="field">
        <span className="lbl">データ</span>
        <span className="quiet">記録はこのブラウザの中だけに保存されています。</span>
        <div className="row">
          <button
            type="button"
            className="btn sec"
            onClick={() =>
              navigator.clipboard.writeText(exportData()).then(
                () => toast('データをコピーしました'),
                () => toast('コピーできませんでした'),
              )
            }
          >
            データをコピー（JSON）
          </button>
          <button type="button" className="btn sec" onClick={() => setConfirming(true)}>
            すべて削除
          </button>
        </div>
        {confirming && (
          <div className="confirm">
            記録と設定をすべて削除します。元に戻せません。
            <div className="row" style={{ marginTop: 8 }}>
              <button type="button" className="btn" onClick={onDeleteAll}>
                削除する
              </button>
              <button type="button" className="btn sec" onClick={() => setConfirming(false)}>
                やめる
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="actions">
        <button type="button" className="btn sec" onClick={onClose}>
          閉じる
        </button>
        <button type="button" className="btn" disabled={s.workEnd <= s.workStart} onClick={() => onSave(s)}>
          保存
        </button>
      </div>
    </Modal>
  )
}
