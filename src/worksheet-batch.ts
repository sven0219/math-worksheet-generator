import { generateMixedWorksheet, type AppSettings } from './advanced-generator'
import { seededRandom } from './worksheet-link'
import type { Worksheet } from './generator'

export interface SheetCopy { seed: number; worksheet: Worksheet }

export function newSeed(): number {
  return typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 4294967296)
}

export function makeWorksheets(settings: AppSettings, copies: number): SheetCopy[] {
  const result: SheetCopy[] = []
  const signatures = new Set<string>()
  for (let copy = 0; copy < copies; copy++) {
    let seed = newSeed()
    let worksheet = generateMixedWorksheet(settings, seededRandom(seed))
    let signature = [...new Set(worksheet.problems.map((problem) => problem.text))].sort().join('|')
    for (let attempt = 0; attempt < 20 && signatures.has(signature); attempt++) {
      seed = newSeed()
      worksheet = generateMixedWorksheet(settings, seededRandom(seed))
      signature = [...new Set(worksheet.problems.map((problem) => problem.text))].sort().join('|')
    }
    signatures.add(signature)
    result.push({ seed, worksheet })
  }
  return result
}

export function hasDuplicateCopies(worksheets: SheetCopy[]): boolean {
  const signatures = worksheets.map(({ worksheet }) =>
    [...new Set(worksheet.problems.map((problem) => problem.text))].sort().join('|'))
  return new Set(signatures).size < signatures.length
}
