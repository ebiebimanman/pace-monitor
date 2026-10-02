import type { DayInput, HourlyWeather } from '../types'

/** 埼玉県狭山市 2026-10-01 の時間別データ（Open-Meteo、海面気圧） */
export const sayamaWeather: HourlyWeather = {
  temp: [18.4, 18.4, 18.5, 18.5, 18.5, 18.4, 18.7, 19.2, 20.3, 21.7, 23.5, 25.2, 26.9, 28.3, 29.2, 28.8, 28.6, 27.5, 26.1, 24.5, 23.1, 22.2, 21.3, 20.5],
  rh: [92, 91, 90, 94, 95, 95, 97, 93, 87, 82, 77, 71, 67, 62, 58, 58, 57, 62, 50, 48, 54, 57, 61, 65],
  pressure: [1013.9, 1013.5, 1012.3, 1012.1, 1011.9, 1011.2, 1011.4, 1011.4, 1010.6, 1010.1, 1009.4, 1008.6, 1007.8, 1006.5, 1005.7, 1006.1, 1006.0, 1006.5, 1008.0, 1008.7, 1009.2, 1009.8, 1009.9, 1009.9],
  radiation: [0, 0, 0, 0, 0, 0, 1, 21, 101, 282, 458, 660, 740, 730, 635, 488, 302, 113, 6, 0, 0, 0, 0, 0],
  cloud: [89, 85, 80, 91, 85, 78, 86, 82, 62, 55, 15, 6, 0, 0, 0, 0, 1, 4, 11, 10, 8, 6, 4, 11],
}

/** プロトタイプのサンプルと同じ 1 日 */
export const sampleDay: DayInput = {
  settings: {
    workStart: '09:00',
    workEnd: '18:00',
    bed: '00:00',
    wake: '07:00',
    place: { name: '埼玉県狭山市', lat: 35.853, lon: 139.412 },
    notify: { n1: true, n2: true, n3: false },
  },
  checkin: {
    bed: '00:30',
    wake: '07:00',
    sleepQ: 2,
    cond: 2,
    symptoms: ['頭が重い'],
    aircon: 'none',
    acTemp: 26,
    skipped: false,
  },
  logs: [
    { type: 'window', at: 10.5 },
    { type: 'water', at: 11.17 },
    { type: 'meal', at: 13 },
    { type: 'break', at: 13 },
  ],
  weather: sayamaWeather,
}
