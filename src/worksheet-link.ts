import { generateMixedWorksheet, problemTypeOptions, allMultiplicationTables, type AppSettings } from './advanced-generator'
import { generateWorksheet, generateWorksheetV1, generateWorksheetV2, type Operation, type AdditionRegrouping, type SubtractionRegrouping, type Worksheet } from './generator'

const operations: Operation[] = ['+', '−', '×', '÷']
const additions: AdditionRegrouping[] = ['any', 'without-carry', 'with-carry']
const subtractions: SubtractionRegrouping[] = ['any', 'without-borrow', 'with-borrow']

export function seededRandom(seed: number): () => number {
  // This PRNG is shared by every printed QR version and must remain unchanged.
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function encodeSheet(settings: AppSettings, seed: number, copy: number): string {
  const mask = operations.reduce((value, operation, index) =>
    value | (settings.operations.includes(operation) ? 1 << index : 0), 0)
  const typeMask = problemTypeOptions.reduce((value, [type], index) =>
    value | (settings.problemTypes.includes(type) ? 1 << index : 0), 0)
  const tableMask = settings.multiplicationTables.reduce((value, table) => value | (1 << (table - 2)), 0)
  return `4.${settings.count}.${settings.limit}.${settings.operands}.${mask}.${additions.indexOf(settings.additionRegrouping)}.${subtractions.indexOf(settings.subtractionRegrouping)}.${typeMask.toString(36)}.${tableMask.toString(36)}.${seed.toString(36)}.${copy}`
}

export function decodeSheet(value: string | null): {
  sheet: { seed: number; worksheet: Worksheet }; settings: AppSettings; copy: number
} | null {
  if (!value || value.length > 120) return null
  const legacy = /^([12])\.(50|100)\.(\d{1,4})\.([234])\.([1-9]|1[0-5])\.([0-9a-z]+)\.([1-9]|10)$/.exec(value)
  const v3 = /^3\.(50|100)\.(\d{1,4})\.([234])\.([1-9]|1[0-5])\.([0-2])\.([0-2])\.([0-9a-z]+)\.([1-9]|10)$/.exec(value)
  const v4 = /^4\.(50|100)\.(\d{1,3})\.([234])\.([1-9]|1[0-5])\.([0-2])\.([0-2])\.([0-9a-z]+)\.([0-9a-z]+)\.([0-9a-z]+)\.([1-9]|10)$/.exec(value)
  if (!legacy && !v3 && !v4) return null
  const fields = v4 ? ['4', ...v4.slice(1)]
    : v3 ? ['3', ...v3.slice(1, 7), '1', '73', ...v3.slice(7)]
      : [legacy![1], ...legacy!.slice(2, 6), '0', '0', '1', '73', ...legacy!.slice(6)]
  const [version, countText, limitText, operandsText, maskText, additionText, subtractionText, typeMaskText, tableMaskText, seedText, copyText] = fields
  const seed = Number.parseInt(seedText, 36)
  const limit = Number(limitText)
  const typeMask = Number.parseInt(typeMaskText, 36)
  const tableMask = Number.parseInt(tableMaskText, 36)
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || limit < 2 || limit > (version === '4' ? 200 : 1000)) return null
  if (!Number.isSafeInteger(typeMask) || typeMask < 1 || typeMask >= 2 ** problemTypeOptions.length ||
      !Number.isSafeInteger(tableMask) || tableMask < 0 || tableMask > 255) return null
  const settings: AppSettings = {
    count: Number(countText) as AppSettings['count'], limit,
    operands: Number(operandsText) as AppSettings['operands'],
    operations: operations.filter((_, index) => Number(maskText) & (1 << index)),
    additionRegrouping: additions[Number(additionText)],
    subtractionRegrouping: subtractions[Number(subtractionText)],
    problemTypes: problemTypeOptions.map(([type]) => type).filter((_, index) => typeMask & (1 << index)),
    multiplicationTables: allMultiplicationTables.filter((table) => tableMask & (1 << (table - 2))),
  }
  try {
    const generator = version === '1' ? generateWorksheetV1 : version === '2' ? generateWorksheetV2
      : version === '3' ? generateWorksheet : generateMixedWorksheet
    return { sheet: { seed, worksheet: generator(settings, seededRandom(seed)) }, settings, copy: Number(copyText) }
  } catch {
    // Damaged/impossible QR settings must render an error, not crash the entire page.
    return null
  }
}
