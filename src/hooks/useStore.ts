import { useCallback, useEffect, useState } from 'react'
import type { Checkin, LogEvent, Remedy, Settings } from '../lib/types'
import { load, save } from '../lib/storage'

export interface Store {
  settings: Settings | null
  /** 日付（YYYY-MM-DD）ごと */
  checkins: Record<string, Checkin>
  logs: Record<string, LogEvent[]>
  remedies: Record<string, Remedy[]>
}

const KEYS = ['settings', 'checkins', 'logs', 'remedies'] as const

export const emptyStore = (): Store => ({ settings: null, checkins: {}, logs: {}, remedies: {} })

function loadStore(): Store {
  const e = emptyStore()
  return {
    settings: load('settings', e.settings),
    checkins: load('checkins', e.checkins),
    logs: load('logs', e.logs),
    remedies: load('remedies', e.remedies),
  }
}

/** アプリ全体の記録。変更のたびに localStorage へ書き出す */
export function useStore() {
  const [store, setStore] = useState<Store>(loadStore)

  useEffect(() => {
    for (const k of KEYS) save(k, store[k])
  }, [store])

  const update = useCallback((fn: (s: Store) => Store) => setStore((s) => fn(s)), [])

  return { store, update }
}
