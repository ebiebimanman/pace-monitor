import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  workStart: '09:00',
  workEnd: '18:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  bed: '00:00',
  wake: '07:00',
  place: null,
  notify: { n1: true, n2: true, n3: false },
}
