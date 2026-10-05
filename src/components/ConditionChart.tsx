import { useEffect, useRef, useState } from 'react'
import type { DayInput, LogEvent } from '../lib/types'
import type { ComponentKey, Curve, Hero, PaceDownZone } from '../lib/condition'
import { componentLabel, zoneText } from '../lib/condition'
import { indoorHumidity } from '../lib/humidity'
import { weatherAt } from '../lib/weather'
import { clamp, fmt, toHours } from '../lib/time'
import { RecordIcon } from './icons'
import { RECORD_LABEL, type RecordType } from '../lib/records'

interface Props {
  day: DayInput
  hero: Hero
  curve: Curve
  zones: PaceDownZone[]
  now: number
  /** true のとき親の高さいっぱいに描く（1 画面レイアウト） */
  fill: boolean
  /** 記録のアイコンを押したとき */
  onEditRecord: (e: LogEvent & { type: RecordType }) => void
}

const PAD = { l: 34, r: 14, t: 30, b: 32 }
const isRecord = (e: LogEvent): e is LogEvent & { type: RecordType } => e.type !== 'slump'

export function ConditionChart({ day, hero, curve, zones, now, fill, onEditRecord }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 720, h: 270 })
  const [hover, setHover] = useState<{ t: number; pinned: boolean } | null>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = Math.max(300, Math.round(el.clientWidth))
      const h = fill ? Math.max(140, Math.round(el.clientHeight)) : Math.round(w * (w < 600 ? 0.62 : 0.375))
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fill])

  const { w: W, h: H } = size
  const [t0, t1] = curve.range
  const [w0, w1] = [toHours(day.settings.workStart), toHours(day.settings.workEnd)]
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b)
  const pts = curve.points

  const valueAt = (t: number) => {
    const i = pts.findIndex((p) => p.t >= t)
    if (i <= 0) return pts[0].value
    const a = pts[i - 1]
    const b = pts[i]
    return a.value + ((b.value - a.value) * (t - a.t)) / (b.t - a.t)
  }
  const nowC = clamp(now, t0, t1)
  const path = (arr: [number, number][]) =>
    arr.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ')
  // 曲線は起床から始まる。それより前に開いたときは、全体を予報として描く
  const lineNow = Math.max(nowC, pts[0].t)
  const past: [number, number][] = [...pts.filter((p) => p.t < lineNow).map((p): [number, number] => [p.t, p.value]), [lineNow, valueAt(lineNow)]]
  const future: [number, number][] = [[lineNow, valueAt(lineNow)], ...pts.filter((p) => p.t > lineNow).map((p): [number, number] => [p.t, p.value])]

  const hours: number[] = []
  for (let h = Math.ceil(t0); h <= Math.floor(t1); h++) hours.push(h)

  const tFromPointer = (clientX: number) => {
    const r = boxRef.current!.getBoundingClientRect()
    const vx = ((clientX - r.left) / r.width) * W
    const t = t0 + ((vx - PAD.l) / (W - PAD.l - PAD.r)) * (t1 - t0)
    return clamp(Math.round(t), Math.ceil(t0), Math.floor(t1))
  }
  const step = (dir: number) => {
    const base = hover ? hover.t : Math.round(now)
    setHover({ t: clamp(base + dir, Math.ceil(t0), Math.floor(t1)), pinned: true })
  }

  const hp = hover ? pts.reduce((a, p) => (Math.abs(p.t - hover.t) < Math.abs(a.t - hover.t) ? p : a), pts[0]) : null
  const nowLabelRight = x(nowC) > W - 120

  return (
    <div className="chart-box" ref={boxRef}>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        tabIndex={0}
        role="group"
        aria-label="時間帯ごとのコンディション予測の曲線。左右キーで1時間ずつ詳細を見られます。記録のアイコンを押すと時刻を直せます"
        onPointerMove={(e) => {
          if (!hover?.pinned) setHover({ t: tFromPointer(e.clientX), pinned: false })
        }}
        onPointerLeave={(e) => {
          if (!hover?.pinned && e.pointerType === 'mouse') setHover(null)
        }}
        onClick={(e) => {
          const t = tFromPointer(e.clientX)
          setHover(hover?.pinned && hover.t === t ? null : { t, pinned: true })
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault()
            step(e.key === 'ArrowRight' ? 1 : -1)
          }
          if (e.key === 'Escape') setHover(null)
        }}
        onBlur={() => {
          if (hover?.pinned) setHover(null)
        }}
      >
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end">{v}</text>
          </g>
        ))}
        {hours.map((h) => (
          <g key={h}>
            <text x={x(h)} y={H - PAD.b + 16} textAnchor="middle">{h}</text>
            <line x1={x(h)} x2={x(h)} y1={H - PAD.b} y2={H - PAD.b + 4} stroke="var(--line)" />
          </g>
        ))}
        <rect x={PAD.l} y={PAD.t} width={Math.max(0, x(w0) - PAD.l)} height={H - PAD.t - PAD.b} fill="var(--surface-2)" />
        <rect x={x(w1)} y={PAD.t} width={Math.max(0, W - PAD.r - x(w1))} height={H - PAD.t - PAD.b} fill="var(--surface-2)" />

        {zones.map((z) => {
          const zp = pts.filter((p) => p.t >= z.start - 1e-9 && p.t <= z.end + 1e-9)
          const d = `M${x(z.start)},${y(0)} ${zp.map((p) => `L${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')} L${x(z.end)},${y(0)} Z`
          return (
            <g key={z.start}>
              <path d={d} fill={z.strong ? 'var(--dip-strong)' : 'var(--dip)'} />
              <text className="zlabel" x={(x(z.start) + x(z.end)) / 2} y={PAD.t - 12} textAnchor="middle">
                {z.strong ? 'ペースダウン' : 'ややペースダウン'}
              </text>
            </g>
          )
        })}

        <line x1={x(w0)} x2={x(w1)} y1={y(hero.value)} y2={y(hero.value)} stroke="var(--muted)" strokeDasharray="3 4" />
        <text x={x(w1) - 2} y={y(hero.value) - 5} textAnchor="end">平均 {hero.value}%</text>

        {past.length > 1 && <path d={path(past)} fill="none" stroke="var(--past)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {future.length > 1 && <path d={path(future)} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}

        {stackRecords(day.logs, t0, t1, x).map(({ e, row }, i) => {
          const cx = x(e.at)
          const cy = H - PAD.b - 12 - row * 22
          return (
            <g
              key={`${e.type}-${e.at}-${i}`}
              className="rec"
              style={{ color: 'var(--accent)' }}
              role="button"
              tabIndex={0}
              aria-label={`${RECORD_LABEL[e.type]}${e.minutes ? `（${e.minutes}分）` : ''} ${fmt(e.at)}。押すと編集`}
              onClick={(ev) => {
                // グラフの表示固定には使わない
                ev.stopPropagation()
                onEditRecord(e)
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault()
                  ev.stopPropagation()
                  onEditRecord(e)
                }
              }}
            >
              <title>{`${RECORD_LABEL[e.type]}${e.minutes ? `（${e.minutes}分）` : ''} ${fmt(e.at)}（押すと編集）`}</title>
              <circle cx={cx} cy={cy} r={10} fill="var(--surface)" stroke="var(--line)" />
              <RecordIcon type={e.type} size={13} x={cx - 6.5} y={cy - 6.5} />
            </g>
          )
        })}

        {now >= pts[0].t && now <= t1 && (
          <g>
            <line x1={x(nowC)} x2={x(nowC)} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink)" opacity={0.35} />
            <circle cx={x(nowC)} cy={y(valueAt(nowC))} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
            <text className="nowlabel" x={x(nowC) + (nowLabelRight ? -8 : 8)} y={y(valueAt(nowC)) - 10} textAnchor={nowLabelRight ? 'end' : 'start'}>
              いま {Math.round(valueAt(nowC))}%
            </text>
          </g>
        )}

        {hp && (
          <g>
            <line x1={x(hp.t)} x2={x(hp.t)} y1={PAD.t} y2={H - PAD.b} stroke="var(--accent)" strokeDasharray="2 3" />
            <circle cx={x(hp.t)} cy={y(hp.value)} r={5} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && <ChartTip day={day} hero={hero} zones={zones} t={hp.t} value={hp.value} parts={hp.parts} left={x(hp.t)} width={W} />}
    </div>
  )
}

/** 近い時刻の記録は重ならないように上へ積む */
function stackRecords(logs: LogEvent[], t0: number, t1: number, x: (t: number) => number) {
  const out: { e: LogEvent & { type: RecordType }; row: number }[] = []
  for (const e of logs.filter(isRecord).filter((e) => e.at >= t0 && e.at <= t1).sort((a, b) => a.at - b.at)) {
    const near = out.filter((o) => Math.abs(x(o.e.at) - x(e.at)) < 20)
    const used = new Set(near.map((o) => o.row))
    let row = 0
    while (used.has(row)) row++
    out.push({ e, row })
  }
  return out
}

interface TipProps {
  day: DayInput
  hero: Hero
  zones: PaceDownZone[]
  t: number
  value: number
  parts: Record<ComponentKey, number>
  left: number
  width: number
}

function ChartTip({ day, hero, zones, t, value, parts, left, width }: TipProps) {
  const entries = (Object.entries(parts) as [ComponentKey, number][]).filter(([, v]) => Math.abs(v) >= 1)
  const neg = entries.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]).slice(0, 3)
  const pos = entries.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 1)
  const zone = zones.find((z) => t >= z.start && t <= z.end)
  const off = t < toHours(day.settings.workStart) || t > toHours(day.settings.workEnd)
  const { checkin: c, weather: w } = day
  const style = left > width / 2 ? { right: width - left + 12 } : { left: left + 12 }

  return (
    <div className="tip" style={style} role="status">
      <div className="tt">
        <b>
          {fmt(t)}
          {off && <small> 仕事時間外</small>}
        </b>
        <span>{Math.round(value)}%</span>
      </div>
      {zone && (
        <div className="zn">
          {zone.strong ? 'ペースダウン' : 'ややペースダウン'}（{zoneText(day, zone, hero.sleep).name}）
        </div>
      )}
      <ul>
        {[...neg, ...pos].map(([k, v]) => (
          <li key={k}>
            <span>{componentLabel(day, k, t)}</span>
            <span className="n">{v > 0 ? '+' : '−'}{Math.abs(v).toFixed(0)}</span>
          </li>
        ))}
        {!neg.length && !pos.length && <li><span>目立つ要因なし</span></li>}
      </ul>
      <div className="wxl">
        {weatherAt(w, 'temp', t).toFixed(1)}℃・室内湿度 約{Math.round(indoorHumidity(w, t, c.aircon, c.acTemp))}%・
        {weatherAt(w, 'pressure', t).toFixed(0)}hPa・日射 {Math.round(weatherAt(w, 'radiation', t))}W/m²
      </div>
    </div>
  )
}
