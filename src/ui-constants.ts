import type {
  AdditionRegrouping,
  Operation,
  ProblemType,
  Settings,
  SubtractionRegrouping,
} from './generator'

export type PaperStyle =
  | 'plain' | 'squares' | 'large-squares' | 'lines' | 'double-lines' | 'dots' | 'tianzi' | 'mi'
export type PresetId = 'preschool' | 'grade1-first' | 'grade1-second' | 'grade2' | 'custom'
export type SettingsTab = 'basics' | 'types' | 'life' | 'print'
export type SettingsMode = 'quick' | 'advanced'

export const quickPaperStyles: PaperStyle[] = ['plain', 'squares', 'lines']

export interface SettingsPreset {
  id: Exclude<PresetId, 'custom'>
  label: string
  description: string
  settings: Pick<Settings, 'limit' | 'operations' | 'operands' | 'additionRegrouping' | 'subtractionRegrouping'>
}

export const styleLabels: Record<PaperStyle, string> = {
  plain: '清爽白纸', squares: '数学方格', 'large-squares': '大方格',
  lines: '整齐横线', 'double-lines': '双线本',
  dots: '点点阵列', tianzi: '田字格纸', mi: '米字格',
}
export const styleIcons: Record<PaperStyle, string> = {
  plain: '◻', squares: '▦', 'large-squares': '▣', lines: '☷',
  'double-lines': '═', dots: '⠿', tianzi: '田', mi: '米',
}
export const operationNames: Record<Operation, string> = {
  '+': '加法', '−': '减法', '×': '乘法', '÷': '除法',
}
export const operationSymbols: Operation[] = ['+', '−', '×', '÷']
export const paperStyles: PaperStyle[] = [
  'plain', 'squares', 'large-squares', 'lines', 'double-lines', 'dots', 'tianzi', 'mi',
]
export const additionRegroupingOptions: Array<[AdditionRegrouping, string]> = [
  ['any', '随机'], ['without-carry', '不进位'], ['with-carry', '必须进位'],
]
export const subtractionRegroupingOptions: Array<[SubtractionRegrouping, string]> = [
  ['any', '随机'], ['without-borrow', '不退位'], ['with-borrow', '必须退位'],
]
export const settingsPresets: SettingsPreset[] = [
  {
    id: 'preschool', label: '幼小衔接', description: '10 以内加减',
    settings: {
      limit: 10, operations: ['+', '−'], operands: 2,
      additionRegrouping: 'any', subtractionRegrouping: 'any',
    },
  },
  {
    id: 'grade1-first', label: '一年级上', description: '20 以内加减',
    settings: {
      limit: 20, operations: ['+', '−'], operands: 2,
      additionRegrouping: 'any', subtractionRegrouping: 'any',
    },
  },
  {
    id: 'grade1-second', label: '一年级下', description: '100 以内加减',
    settings: {
      limit: 100, operations: ['+', '−'], operands: 2,
      additionRegrouping: 'any', subtractionRegrouping: 'any',
    },
  },
  {
    id: 'grade2', label: '二年级', description: '100 以内四则',
    settings: {
      limit: 100, operations: ['+', '−', '×', '÷'], operands: 2,
      additionRegrouping: 'any', subtractionRegrouping: 'any',
    },
  },
]
export const problemTypeSymbols: Record<ProblemType, string> = {
  calculation: '＝', missing: '□', comparison: '＞', operator: '○', multiplication: '×',
  vertical: '↕', time: '◷', money: '¥', unit: '↔', fraction: '½', decimal: '.1', remainder: '…',
}
export const specialtyTypes: ProblemType[] = ['calculation', 'missing', 'comparison', 'operator', 'multiplication', 'vertical', 'remainder']
export const lifeTypes: ProblemType[] = ['time', 'money', 'unit', 'fraction', 'decimal']
export const settingsTabs: Array<[SettingsTab, string, string]> = [
  ['basics', '基础计算', '范围与运算'],
  ['types', '题型专项', '填空、口诀、竖式'],
  ['life', '生活数学', '时间、单位、分数'],
  ['print', '打印设置', '题量、纸张、答案'],
]
export const limitPresets = [5, 10, 20, 50, 100, 200]
