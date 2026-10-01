import { useState } from 'react'
import type { Settings } from '../lib/types'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import { Modal } from './Modal'
import { PlacePicker } from './PlacePicker'
import { NotifyFields, SleepFields, WorkFields } from './SettingsFields'

const STEPS = [
  { title: '仕事の時間', lead: 'グラフを表示する範囲と、通知を出す時間に使います。' },
  { title: 'いつもの睡眠', lead: '朝のチェックインの初期値になります。チェックインしなかった日もこの時刻で計算します。' },
  { title: '場所', lead: '天気（気温・湿度・気圧・日差し）の取得に使います。' },
  { title: '通知', lead: '' },
]

export function OnboardingModal({ onDone }: { onDone: (s: Settings) => void }) {
  const [step, setStep] = useState(0)
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS)
  const set = (p: Partial<Settings>) => setS((cur) => ({ ...cur, ...p }))
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : onDone(s))

  return (
    <Modal label="はじめに" onClose={() => onDone(s)}>
      <div className="steps" aria-label={`ステップ ${step + 1} / ${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <i key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      <h3>{STEPS[step].title}</h3>
      {STEPS[step].lead && <p className="lead">{STEPS[step].lead}</p>}
      {step === 0 && <WorkFields s={s} set={set} />}
      {step === 1 && <SleepFields s={s} set={set} />}
      {step === 2 && <PlacePicker value={s.place} onChange={(place) => set({ place })} />}
      {step === 3 && <NotifyFields s={s} set={set} />}
      <div className="actions">
        {step > 0 && (
          <button type="button" className="btn sec" onClick={() => setStep(step - 1)}>
            戻る
          </button>
        )}
        <button type="button" className="btn sec" disabled={s.workEnd <= s.workStart} onClick={next}>
          スキップ
        </button>
        <button type="button" className="btn" disabled={s.workEnd <= s.workStart} onClick={next}>
          {step < STEPS.length - 1 ? '次へ' : 'はじめる'}
        </button>
      </div>
    </Modal>
  )
}
