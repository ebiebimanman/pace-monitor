import { BREAK_MINUTES } from '../lib/records'
import { Modal } from './Modal'

interface Props {
  onPick: (minutes: number) => void
  onClose: () => void
}

/** 「休憩する」で開く。長さを選ぶとそのまま記録する */
export function BreakModal({ onPick, onClose }: Props) {
  return (
    <Modal label="休憩する" onClose={onClose}>
      <h3>どのくらい休憩しますか？</h3>
      <p className="lead">休憩が終わってから、休憩なしの時間を数え始めます。</p>
      <div className="chips">
        {BREAK_MINUTES.map((m) => (
          <button key={m} type="button" className="chip lg" onClick={() => onPick(m)}>
            {m}分
          </button>
        ))}
      </div>
      <div className="actions">
        <button type="button" className="btn sec" onClick={onClose}>
          閉じる
        </button>
      </div>
    </Modal>
  )
}
