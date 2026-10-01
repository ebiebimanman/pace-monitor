import { useEffect, useState } from 'react'

/** 30 秒ごとに更新される現在時刻 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    const onVisible = () => {
      if (!document.hidden) setNow(new Date())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])
  return now
}

/** その日の 0 時からの時間（小数） */
export const hoursOf = (d: Date) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
