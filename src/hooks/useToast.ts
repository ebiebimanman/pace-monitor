import { useCallback, useEffect, useRef, useState } from 'react'

export interface ToastMessage {
  text: string
  undo?: () => void
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = useCallback((text: string, undo?: () => void) => {
    clearTimeout(timer.current)
    setToast({ text, undo })
    timer.current = setTimeout(() => setToast(null), 5000)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return { toast, show, hide: () => setToast(null) }
}
