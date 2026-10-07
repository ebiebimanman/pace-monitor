import { useEffect } from 'react'
import type { PaceDownZone } from '../lib/condition'
import type { Settings } from '../lib/types'
import { load, save } from '../lib/storage'
import { fmt, toHours } from '../lib/time'

interface Sent {
  date: string
  ids: string[]
  /** 最後に通知した時刻（時間） */
  last: number | null
}

interface Input {
  settings: Settings | null
  today: string
  now: number
  zones: PaceDownZone[]
  zoneName: (z: PaceDownZone) => string
  checkedIn: boolean
  ventHours: number
  breakHours: number
}

/** 送った N1 の区間の開始時刻。id は `n1-<開始時刻>` */
const sentN1 = (ids: string[]) => ids.filter((id) => id.startsWith('n1-')).map((id) => Number(id.slice(3)))

/** その時点で出すべき通知を 1 件だけ返す（仕様 4-6） */
export function pickNotification(i: Input, sent: Sent): { id: string; title: string; body: string } | null {
  const s = i.settings
  if (!s) return null
  const w0 = toHours(s.workStart)
  const w1 = toHours(s.workEnd)
  if (i.now < w0 - 0.25 || i.now > w1) return null
  const fresh = (id: string) => !sent.ids.includes(id)

  // N1 は 1 時間の間隔を待たない。待つと、その間に始まった区間を知らせそびれる
  if (s.notify.n1) {
    const done = sentN1(sent.ids)
    for (const z of i.zones) {
      // 天気の更新などで区間の開始が少しずれても、同じ区間には 1 回だけ
      if (done.some((t) => t >= z.start - 1 && t <= z.end)) continue
      if (i.now < z.start - 5 / 60 || i.now >= z.end) continue
      const id = `n1-${z.start}`
      // スリープやタブの停止で 5 分前を逃しても、区間の途中なら知らせる
      return i.now < z.start
        ? {
            id,
            title: 'まもなくペースダウン時間です',
            body: `${fmt(z.start)}頃から集中が落ちやすくなります（${i.zoneName(z)}）。軽い作業を用意しておきましょう。`,
          }
        : {
            id,
            title: 'ペースダウン時間に入っています',
            body: `${fmt(z.end)}頃まで集中が落ちやすい時間です（${i.zoneName(z)}）。軽い作業に切り替えましょう。`,
          }
    }
  }
  if (sent.last !== null && i.now - sent.last < 1) return null
  if (s.notify.n2 && !i.checkedIn && i.now >= w0 && fresh('n2')) {
    return { id: 'n2', title: '今日のチェックインがまだです', body: '30秒ほどで答えられます。答えると、今日のコンディションを計算します。' }
  }
  if (s.notify.n3) {
    const z = i.zones.find((z) => i.now >= z.start && i.now <= z.end)
    const id = z && `n3-${z.start}`
    if (z && id && fresh(id) && (i.ventHours > 1.5 || i.breakHours > 2)) {
      return { id, title: '換気か休憩をどうぞ', body: '集中が落ちやすい時間です。窓を開けるか、少し休憩してください。' }
    }
  }
  return null
}

/** タブを開いている間だけブラウザ通知を出す */
export function useNotifications(i: Input) {
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    let sent = load<Sent>('notified', { date: i.today, ids: [], last: null })
    if (sent.date !== i.today) sent = { date: i.today, ids: [], last: null }
    const n = pickNotification(i, sent)
    if (!n) return
    try {
      new Notification(n.title, { body: n.body, tag: n.id })
    } catch {
      return
    }
    save<Sent>('notified', { date: i.today, ids: [...sent.ids, n.id], last: i.now })
  })
}
