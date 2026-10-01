/** localStorage の読み書き。プライベートウィンドウなどで失敗しても落ちないようにする */
const PREFIX = 'pace-monitor:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 保存できなくても画面は動かす
  }
}

/** 日本時間の YYYY-MM-DD */
export function todayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(date)
}
