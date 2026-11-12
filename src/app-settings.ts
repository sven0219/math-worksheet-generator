import type { ProblemType, Settings } from './generator'

export interface AppSettings extends Settings {
  problemTypes: ProblemType[]
  multiplicationTables: number[]
}
