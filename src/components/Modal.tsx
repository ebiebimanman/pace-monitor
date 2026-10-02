import { useEffect, useRef } from 'react'

interface Props {
  label: string
  onClose: () => void
  children: React.ReactNode
}

/** 画面中央のシート。背景クリックと Esc で閉じる */
export function Modal({ label, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // onClose は親の再描画ごとに作り直されるので ref 経由で参照し、effect は開いたときだけ走らせる
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button, input, select')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [])

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        {children}
      </div>
    </div>
  )
}
