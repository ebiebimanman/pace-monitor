import { useState } from 'react'
import type { Settings } from '../lib/types'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import { Modal } from './Modal'
import { PlacePicker } from './PlacePicker'
import { BodyFields, NotifyFields, SleepFields, WorkFields } from './SettingsFields'

const STEPS = [
  { title: '仕事の時間', lead: 'グラフに表示する時間帯と、通知を送る時間帯を決めるのに使います。' },
  { title: 'いつもの睡眠', lead: '朝のチェックインには、この時刻が最初から入っています。チェックインしなかった日も、この時刻で計算します。' },
  { title: 'からだのこと', lead: '月経周期は、集中のしやすさに大きく関わります。答えた内容はこのブラウザの中だけに保存します。答えたくなければスキップしてください。' },
  { title: '場所', lead: 'この場所の気温・湿度・気圧・日差しを取得して、予報に使います。' },
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
      {step === 2 && <BodyFields s={s} set={set} />}
      {step === 3 && <PlacePicker value={s.place} onChange={(place) => set({ place })} />}
      {step === 4 && <NotifyFields s={s} set={set} />}
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
