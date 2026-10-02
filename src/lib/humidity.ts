import type { Aircon, HourlyWeather } from './types'
import { clamp } from './time'
import { weatherAt } from './weather'

/** 飽和水蒸気圧（hPa） */
export const saturationVaporPressure = (tempC: number) =>
  6.112 * Math.exp((17.62 * tempC) / (243.12 + tempC))

/**
 * 推定室内湿度（%）。外気の水蒸気圧は室内でも変わらないと仮定する。
 * 冷房は除湿されるので 40〜65% に収める。
 */
export function indoorHumidity(w: HourlyWeather, t: number, aircon: Aircon, acTemp: number): number {
  const rhOut = weatherAt(w, 'rh', t)
  if (aircon === 'none') return rhOut
  const e = (rhOut / 100) * saturationVaporPressure(weatherAt(w, 'temp', t))
  const rhIn = (e / saturationVaporPressure(acTemp)) * 100
  return aircon === 'cool' ? clamp(rhIn, 40, 65) : rhIn
}

/** 湿度の注意書き。「蒸し暑い」は室温が 25℃ 以上のときだけで、それより涼しければ「湿気が多め」 */
export function humidityLabel(rh: number, tempC: number): string {
  if (rh < 30) return 'かなり乾燥'
  if (rh < 40) return '乾燥ぎみ'
  if (rh > 70) return tempC >= 25 ? '蒸し暑い' : '湿気が多め'
  return ''
}
