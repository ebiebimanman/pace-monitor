import type { DayInput } from '../lib/types'
import type { ComponentKey, Curve, Hero, PaceDownZone } from '../lib/condition'
import { componentLabel, heroComment, valueAt, zoneText } from '../lib/condition'
import { fmt, toHours } from '../lib/time'
import { ConditionChart } from './ConditionChart'

interface Props {
  day: DayInput
  hero: Hero
  curve: Curve
  zones: PaceDownZone[]
  now: number
  provisional: boolean
  fill: boolean
}

export function HeroPanel({ day, hero, curve, zones, now, provisional, fill }: Props) {
  return (
    <section className="panel main" aria-labelledby="heroH">
      <div className="hero">
        <div className="pct">
          {hero.value}
          <small>%</small>
        </div>
        <div>
          <h2 id="heroH">
            今日のコンディション
            {provisional && <span className="badge" title="チェックインすると精度が上がります">仮</span>}
          </h2>
          <p className="sub">睡眠・体調・天気から見た、今日の力の出しやすさ</p>
          <p className="comment">{heroComment(hero.value)}</p>
          <details className="breakdown">
            <summary>内訳を見る</summary>
            <ul className="bd-list">
              {hero.deductions.slice(0, 3).map((d) => (
                <li key={d.label}>
                  <span>{d.label}</span>
                  <span className="pts">−{d.points}</span>
                </li>
              ))}
              {!hero.deductions.length && (
                <li>
                  <span>減点はありません</span>
                </li>
              )}
            </ul>
          </details>
        </div>
      </div>

      <div className="chart-head">
        <h2>時間帯ごとのコンディション</h2>
        <div className="legend">
          <span>
            <i style={{ background: 'var(--accent)' }} />
            予測
          </span>
          <span>
            <i style={{ background: 'var(--dip-strong)' }} />
            ペースダウン時間
          </span>
        </div>
      </div>
      <ConditionChart day={day} hero={hero} curve={curve} zones={zones} now={now} fill={fill} />
      <p className="chart-hint">グラフにカーソルを合わせる（タップする）と、1時間ごとのコンディションと理由が見られます。クリックで固定。</p>
      <NowCard day={day} hero={hero} curve={curve} zones={zones} now={now} />
    </section>
  )
}

function NowCard({ day, hero, curve, zones, now }: Omit<Props, 'provisional' | 'fill'>) {
  const { parts, value } = valueAt(day, hero, curve, now)
  const zone = zones.find((z) => now >= z.start && now <= z.end)
  const next = zones.find((z) => z.start > now)
  const entries = (Object.entries(parts) as [ComponentKey, number][]).filter(([, v]) => Math.abs(v) >= 1)
  const neg = entries.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]).slice(0, 3)
  const pos = entries.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 1)
  const zt = zone && zoneText(day, zone, hero.sleep)
  const offWork = now < toHours(day.settings.workStart) || now > toHours(day.settings.workEnd)

  return (
    <div className={`nowc${zone ? ' in' : ''}`}>
      <div className="nc-head">
        <span className="label">いま {fmt(now)}</span>
        <span className="nc-v">{Math.round(value)}%</span>
        <span className="nc-st">
          {zone && zt
            ? `${zone.strong ? 'ペースダウン' : 'ややペースダウン'}中（${zt.name}）・${fmt(zone.end)}まで`
            : offWork
              ? '仕事時間外'
              : '通常ペース'}
        </span>
      </div>
      {zt && <p className="nc-tip">{zt.tip}</p>}
      <ul className="nc-f">
        {[...neg, ...pos].map(([k, v]) => (
          <li key={k}>
            <span>{componentLabel(day, k, now)}</span>
            <span className="n">{v > 0 ? '+' : '−'}{Math.abs(v).toFixed(0)}</span>
          </li>
        ))}
        {!neg.length && !pos.length && (
          <li>
            <span>目立つ要因なし</span>
          </li>
        )}
      </ul>
      <p className="nc-next">
        {next
          ? `次のペースダウン：${fmt(next.start)}–${fmt(next.end)}（${zoneText(day, next, hero.sleep).name}）`
          : 'このあとペースダウンの予報はありません。'}
      </p>
    </div>
  )
}
