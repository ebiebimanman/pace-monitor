import type { Remedy, RemedyResult } from '../lib/types'
import { fmt } from '../lib/time'

interface Props {
  remedies: Remedy[]
  now: number
  onAnswer: (remedy: Remedy, result: RemedyResult) => void
}

const RESULT_LABEL: Record<RemedyResult, string> = {
  better: 'ラクになった',
  same: '変わらない',
  unknown: 'わからない',
  expired: '',
}
const short = (action: string) => action.split('、')[0]

export function ReflectionPanel({ remedies, now, onAnswer }: Props) {
  const answered = remedies.filter((r) => r.result === 'better' || r.result === 'same')
  const stats = new Map<string, { n: number; better: number }>()
  for (const r of answered) {
    const s = stats.get(r.action) ?? { n: 0, better: 0 }
    s.n++
    if (r.result === 'better') s.better++
    stats.set(r.action, s)
  }
  const best = [...stats.entries()].filter(([, s]) => s.better > 0).sort((a, b) => b[1].better - a[1].better)[0]

  const pending = remedies.filter((r) => !r.result).sort((a, b) => b.at - a.at)
  const ready = pending.filter((r) => now - r.at >= 0.25)
  const waiting = pending.filter((r) => now - r.at < 0.25)
  const recent = remedies
    .filter((r) => r.result && r.result !== 'expired')
    .sort((a, b) => b.at - a.at)
    .slice(0, 3)
  const empty = !best && !ready.length && !waiting.length && !recent.length

  return (
    <section className="panel refl" aria-labelledby="rfH">
      <h2 id="rfH">ふりかえり</h2>
      {best && (
        <p className="refl-sum">
          よく効く対処：{short(best[0])}（{best[1].n}回中{best[1].better}回ラクに）
        </p>
      )}
      {ready.length > 0 && (
        <div className="refl-card">
          <p className="q">{fmt(ready[0].at)} に試したこと、どうでした？</p>
          {ready.map((r) => (
            <div className="rq" key={`${r.cause}-${r.at}`}>
              <span>{r.action}</span>
              <div className="chips">
                {(['better', 'same', 'unknown'] as const).map((res) => (
                  <button key={res} type="button" className="chip" onClick={() => onAnswer(r, res)}>
                    {RESULT_LABEL[res]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {waiting.length > 0 && (
        <p className="quiet">
          {fmt(waiting[0].at)} に試した{waiting.length}つは、{fmt(waiting[0].at + 0.25)} ごろにここで聞きます。
        </p>
      )}
      {recent.length > 0 && (
        <ul className="refl-list">
          {recent.map((r) => (
            <li key={`${r.cause}-${r.at}`}>
              {fmt(r.at)}　{short(r.action)} → {RESULT_LABEL[r.result!]}
            </li>
          ))}
        </ul>
      )}
      {empty && <p className="quiet">「集中切れた」で対処を試すと、効いたかどうかをここで記録できます。</p>}
    </section>
  )
}
