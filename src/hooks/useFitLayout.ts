import { useEffect, useState } from 'react'

const QUERY = '(min-width: 881px) and (min-height: 620px)'

/** PC 幅で十分な高さがあるとき、ページをスクロールさせず 1 画面に収める */
export function useFitLayout(): boolean {
  const [fit, setFit] = useState(() => window.matchMedia(QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const on = () => setFit(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('fit', fit)
  }, [fit])
  return fit
}
