import type { RecordType } from '../lib/records'

/** icons/ の wind.svg・coffee.svg・droplet.svg と同じパス（Feather Icons） */
const PATHS: Record<RecordType, React.ReactNode> = {
  window: <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />,
  break: (
    <>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </>
  ),
  water: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
}

interface Props {
  type: RecordType
  size?: number
  x?: number
  y?: number
}

export function RecordIcon({ type, size = 20, x, y }: Props) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[type]}
    </svg>
  )
}

export function Face({ level }: { level: 1 | 2 | 3 }) {
  const mouth = ['', 'M8 14.5q4 3.5 8 0', 'M8.5 15.5h7', 'M8 16.5q4-3.5 8 0'][level]
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="9" cy="10" r=".8" fill="currentColor" />
      <circle cx="15" cy="10" r=".8" fill="currentColor" />
      <path d={mouth} />
    </svg>
  )
}

export function PulseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  )
}
