import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import type { Aircon, Checkin, DayInput, LogEvent, Remedy, RemedyResult, Settings } from './lib/types'
import { computeCurve, computeHero, findZones, hoursSince, mealPreview, zoneText } from './lib/condition'
import { suggest, type Suggestion } from './lib/causes'
import { cycleInfo } from './lib/cycle'
import { todayKey } from './lib/storage'
import { clamp, fmt, toHours } from './lib/time'
import { hoursOf, useNow } from './hooks/useNow'
import { emptyStore, useStore } from './hooks/useStore'
import { NEUTRAL_WEATHER, useWeather } from './hooks/useWeather'
import { useNotifications } from './hooks/useNotifications'
import { useFitLayout } from './hooks/useFitLayout'
import { HeroPanel } from './components/HeroPanel'
import { StatusPanel } from './components/StatusPanel'
import { ReflectionPanel } from './components/ReflectionPanel'
import { CheckinModal } from './components/CheckinModal'
import { SlumpModal } from './components/SlumpModal'
import { BreakModal } from './components/BreakModal'
import { RecordEditModal } from './components/RecordEditModal'
import { OnboardingModal } from './components/OnboardingModal'
import { SettingsModal } from './components/SettingsModal'
import { Toast } from './components/Toast'
import { useToast } from './hooks/useToast'
import { PulseIcon } from './components/icons'
import { RECORD_LABEL, type RecordType } from './lib/records'

type Dialog = null | 'checkin' | 'checkin-edit' | 'slump' | 'settings' | 'break'

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土']

/** チェックインがない日の仮の回答（いつもの時刻・ふつう） */
function provisionalCheckin(s: Settings, previous: Checkin | undefined): Checkin {
  return {
    bed: s.bed,
    wake: s.wake,
    sleepQ: 2,
    cond: 2,
    symptoms: [],
    aircon: previous?.aircon ?? 'none',
    acTemp: previous?.acTemp ?? 26,
    skipped: true,
  }
}

export default function App() {
  const { store, update } = useStore()
  const nowDate = useNow()
  const now = hoursOf(nowDate)
  const today = todayKey(nowDate)
  const fit = useFitLayout()
  const { toast, show, hide } = useToast()
  const [dialog, setDialog] = useState<Dialog>(null)
  // グラフのアイコンから編集中の記録
  const [editing, setEditing] = useState<(LogEvent & { type: RecordType }) | null>(null)
  // 自動で開いたチェックインを閉じた日。同じ日にもう一度は開かない
  const [dismissedDay, setDismissedDay] = useState<string | null>(null)

  const settings = store.settings
  const weatherState = useWeather(settings?.place ?? null, today)
  const weather =
    weatherState.status === 'ready' ? weatherState.data : weatherState.status === 'error' && weatherState.data ? weatherState.data : NEUTRAL_WEATHER
  const weatherNote =
    weatherState.status === 'none'
      ? '設定で場所を選ぶと、天気を予報に反映できます'
      : weatherState.status === 'loading'
        ? '読み込み中…'
        : weatherState.status === 'error' && !weatherState.data
          ? weatherState.message
          : null

  const lastCheckin = useMemo(() => {
    const days = Object.keys(store.checkins).filter((d) => d < today).sort()
    return days.length ? store.checkins[days[days.length - 1]] : undefined
  }, [store.checkins, today])
  const todayCheckin = store.checkins[today]
  const answered = Boolean(todayCheckin && !todayCheckin.skipped)
  const logs = useMemo(() => store.logs[today] ?? [], [store.logs, today])
  const remedies = useMemo(() => store.remedies[today] ?? [], [store.remedies, today])

  // その日最初の表示ではチェックインを開く
  const autoCheckin = Boolean(settings && !todayCheckin && dismissedDay !== today && dialog === null)
  const checkinDialog = dialog === 'checkin' || dialog === 'checkin-edit' ? dialog : autoCheckin ? 'checkin' : null
  const closeDialog = () => {
    setDialog(null)
    setDismissedDay(today)
  }

  // 2 時間たっても答えなかったふりかえりは未回答にする
  useEffect(() => {
    if (remedies.some((r) => !r.result && now - r.at >= 2)) {
      update((s) => ({
        ...s,
        remedies: { ...s.remedies, [today]: (s.remedies[today] ?? []).map((r) => (!r.result && now - r.at >= 2 ? { ...r, result: 'expired' } : r)) },
      }))
    }
  }, [remedies, now, today, update])

  const day: DayInput | null = settings
    ? { settings, checkin: todayCheckin ?? provisionalCheckin(settings, lastCheckin), logs, weather, cycle: cycleInfo(settings, today) }
    : null
  // 15 分刻みで 50 点ほどの計算なので、描画ごとに計算し直す
  const calc = day
    ? (() => {
        const hero = computeHero(day)
        const curve = computeCurve(day, hero)
        return { hero, curve, zones: findZones(day, hero, curve) }
      })()
    : null

  useNotifications({
    settings,
    today,
    now,
    zones: calc?.zones ?? [],
    zoneName: (z) => (day && calc ? zoneText(day, z, calc.hero.sleep).name : ''),
    checkedIn: Boolean(todayCheckin),
    ventHours: settings ? hoursSince(logs, 'window', now, toHours(settings.workStart)) : 0,
    breakHours: settings ? hoursSince(logs, 'break', now, toHours(settings.workStart)) : 0,
  })

  const setLogs = useCallback(
    (fn: (l: LogEvent[]) => LogEvent[]) => update((s) => ({ ...s, logs: { ...s.logs, [today]: fn(s.logs[today] ?? []) } })),
    [update, today],
  )
  const setRemedies = useCallback(
    (fn: (r: Remedy[]) => Remedy[]) => update((s) => ({ ...s, remedies: { ...s.remedies, [today]: fn(s.remedies[today] ?? []) } })),
    [update, today],
  )
  const setCheckin = (c: Checkin) => update((s) => ({ ...s, checkins: { ...s.checkins, [today]: c } }))

  const record = (type: RecordType, minutes?: number) => {
    // 休憩は長さを選んでから記録する
    if (type === 'break' && minutes === undefined) return setDialog('break')
    const ev: LogEvent = minutes === undefined ? { type, at: now } : { type, at: now, minutes }
    setLogs((l) => [...l, ev])
    const label = minutes === undefined ? RECORD_LABEL[type] : `${RECORD_LABEL[type]}（${minutes}分）`
    show(`${label}を記録しました`, () => setLogs((l) => l.filter((e) => !(e.type === ev.type && e.at === ev.at))))
  }

  const changeAircon = (aircon: Aircon) => {
    if (!day) return
    const cur = day.checkin
    const acTemp = aircon !== cur.aircon && aircon !== 'none' ? (aircon === 'heat' ? 21 : 26) : cur.acTemp
    setCheckin({ ...cur, aircon, acTemp })
  }
  const changeTemp = (delta: number) => {
    if (!day) return
    setCheckin({ ...day.checkin, acTemp: clamp(day.checkin.acTemp + delta, 16, 30) })
  }

  // 「集中切れた」で入れた記録。取り消しで同じものを消すために覚えておく
  const [tryRecords] = useState(() => new Map<string, { log: LogEvent | null; remedy: Remedy }>())
  const startSlump = (symptoms: string[]): Suggestion[] => {
    if (!day) return []
    const at = now
    setRemedies((r) => r.map((x) => (x.result ? x : { ...x, result: 'expired' })))
    setLogs((l) => [...l, { type: 'slump', at, symptoms }])
    const history = Object.values(store.remedies).flat()
    return suggest(day, at, symptoms, history)
  }
  const toggleTry = (s: Suggestion, on: boolean) => {
    if (on) {
      // 対処の休憩はどれも 5 分
      const log: LogEvent | null = s.log ? (s.log === 'break' ? { type: s.log, at: now, minutes: 5 } : { type: s.log, at: now }) : null
      const remedy: Remedy = { cause: s.cause, action: s.action, at: now, result: null }
      tryRecords.set(s.cause, { log, remedy })
      if (log) setLogs((l) => [...l, log])
      setRemedies((r) => [...r, remedy])
    } else {
      const rec = tryRecords.get(s.cause)
      if (!rec) return
      tryRecords.delete(s.cause)
      const { log, remedy } = rec
      if (log) setLogs((l) => l.filter((e) => !(e.type === log.type && e.at === log.at)))
      setRemedies((r) => r.filter((x) => !(x.cause === remedy.cause && x.at === remedy.at)))
    }
  }
  const answer = (remedy: Remedy, result: RemedyResult) =>
    setRemedies((r) => r.map((x) => (x.cause === remedy.cause && x.at === remedy.at ? { ...x, result } : x)))

  const dateLabel = `${nowDate.getMonth() + 1}月${nowDate.getDate()}日（${WEEKDAY[nowDate.getDay()]}）`

  return (
    <div className="app">
      <div className="wrap">
        <header className="top">
          <div className="brand">
            <h1>ペース予報</h1>
            <span>
              {dateLabel}
              {settings?.place && `・${settings.place.name}`}
            </span>
          </div>
          {settings && (
            <nav className="topnav">
              <button type="button" className="ghost" onClick={() => setDialog(answered ? 'checkin-edit' : 'checkin')}>
                {answered ? 'チェックインを編集' : 'チェックイン'}
              </button>
              <button type="button" className="ghost" onClick={() => setDialog('settings')}>
                設定
              </button>
            </nav>
          )}
        </header>

        {day && calc && (
          <div className="grid">
            <div className="col">
              <HeroPanel
                day={day}
                hero={calc.hero}
                curve={calc.curve}
                zones={calc.zones}
                now={now}
                provisional={!todayCheckin || todayCheckin.skipped}
                fill={fit}
                onEditRecord={setEditing}
              />
            </div>
            <div className="col">
              <StatusPanel day={day} now={now} weatherNote={weatherNote} onAircon={changeAircon} onTemp={changeTemp} onRecord={record} mealHint={mealPreview(day, now)} />
              <ReflectionPanel remedies={remedies} now={now} onAnswer={answer} />
              <button type="button" className="slump" onClick={() => setDialog('slump')}>
                <PulseIcon />
                集中切れた
              </button>
            </div>
          </div>
        )}
      </div>

      {!settings && (
        <OnboardingModal
          onDone={(s) => {
            update((st) => ({ ...st, settings: s }))
          }}
        />
      )}
      {settings && checkinDialog && (
        <CheckinModal
          initial={checkinDialog === 'checkin-edit' && todayCheckin ? todayCheckin : provisionalCheckin(settings, lastCheckin)}
          editing={checkinDialog === 'checkin-edit'}
          askPeriod={settings.sex === 'female'}
          onSave={(c) => {
            // 「今日から始まった」は最終月経の開始日として覚える。外したら元の日に戻す
            const prevStart = todayCheckin?.periodStarted ? (todayCheckin.prevLastPeriod ?? null) : (settings.lastPeriod ?? null)
            setCheckin(c.periodStarted ? { ...c, prevLastPeriod: prevStart } : c)
            if (c.periodStarted || todayCheckin?.periodStarted) {
              const lastPeriod = c.periodStarted ? today : prevStart
              update((st) => ({ ...st, settings: st.settings && { ...st.settings, lastPeriod } }))
            }
            closeDialog()
            show(checkinDialog === 'checkin-edit' ? 'チェックインを更新しました' : '今日のコンディションを計算しました')
          }}
          onLater={() => {
            setCheckin(provisionalCheckin(settings, lastCheckin))
            closeDialog()
            show('いつもの就寝・起床時刻で仮に計算しました。チェックインすると、今日の睡眠と体調で計算し直します')
          }}
          onClose={closeDialog}
        />
      )}
      {dialog === 'slump' && (
        <SlumpModal
          now={now}
          onSymptoms={startSlump}
          onTry={toggleTry}
          onClose={(n) => {
            tryRecords.clear()
            setDialog(null)
            if (n) show(`${n}つの対処を試す予定にしました。15分後に、ラクになったかを「ふりかえり」で聞きます`)
          }}
        />
      )}
      {editing && (
        <RecordEditModal
          record={editing}
          now={now}
          onSave={(next) => {
            setLogs((l) => l.map((e) => (e.type === editing.type && e.at === editing.at ? next : e)))
            setEditing(null)
            show(`${RECORD_LABEL[editing.type]}の時刻を${fmt(next.at)}に直しました`)
          }}
          onDelete={() => {
            const old = editing
            setLogs((l) => l.filter((e) => !(e.type === old.type && e.at === old.at)))
            setEditing(null)
            show(`${RECORD_LABEL[old.type]}の記録を削除しました`, () => setLogs((l) => [...l, old]))
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {dialog === 'break' && (
        <BreakModal
          onPick={(m) => {
            setDialog(null)
            record('break', m)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {settings && dialog === 'settings' && (
        <SettingsModal
          settings={settings}
          exportData={() => JSON.stringify(store, null, 2)}
          onSave={(s) => {
            update((st) => ({ ...st, settings: s }))
            setDialog(null)
            show('設定を保存しました')
          }}
          onDeleteAll={() => {
            update(() => emptyStore())
            setDialog(null)
            setDismissedDay(null)
          }}
          onClose={() => setDialog(null)}
          toast={show}
        />
      )}
      <Toast toast={toast} onHide={hide} />
    </div>
  )
}
