import type { LogType } from './types'

/** 画面から記録できる種類（「集中切れた」以外） */
export type RecordType = Exclude<LogType, 'slump'>

export const RECORD_LABEL: Record<RecordType, string> = { window: '換気', break: '休憩', water: '水', meal: '昼食' }

/** 休憩の長さの選択肢（分） */
export const BREAK_MINUTES = [5, 15, 30, 60] as const
