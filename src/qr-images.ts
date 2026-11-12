import QRCode from 'qrcode'
import type { AppSettings } from './advanced-generator'
import { encodeSheet } from './worksheet-link'
import type { SheetCopy } from './worksheet-batch'

export function resolveSiteBase(homeUrl: string): string {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'https://sven0219.github.io/math-worksheet-generator/'
    : homeUrl
}

export function sheetUrl(
  siteBase: string,
  settings: AppSettings,
  sheet: SheetCopy,
  copyIndex: number,
): string {
  const url = new URL(siteBase)
  url.searchParams.set('sheet', encodeSheet(settings, sheet.seed, copyIndex + 1))
  return url.href
}

export function loadQrImages(
  siteBase: string,
  settings: AppSettings,
  worksheets: SheetCopy[],
): Promise<string[]> {
  return Promise.all(worksheets.map((sheet, index) => QRCode.toDataURL(sheetUrl(siteBase, settings, sheet, index), {
    width: 140, margin: 2, errorCorrectionLevel: 'M',
    color: { dark: '#292d5c', light: '#ffffff' },
  })))
}
