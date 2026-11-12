import {
  type Problem,
  type ProblemType,
  type Worksheet,
} from './generator'
import {
  calculation,
  comparison,
  missing,
  multiplication,
  operatorProblem,
  remainderProblem,
  vertical,
} from './problems/specialty-generators'
import {
  decimalProblem,
  fractionProblem,
  moneyProblem,
  timeProblem,
  unitProblem,
} from './problems/life-generators'
import { specialtyOperations, randomInt } from './problems/utils'

export type { AppSettings } from './app-settings'
import type { AppSettings } from './app-settings'

// Order is part of the v4 QR format. Append new types; never reorder these entries.
export const problemTypeOptions: Array<[ProblemType, string]> = [
  ['calculation', '口算'], ['missing', '填空题'], ['comparison', '比较大小'],
  ['operator', '填运算符'], ['multiplication', '九九口诀'], ['vertical', '竖式计算'],
  ['time', '时间'], ['money', '人民币'], ['unit', '单位换算'],
  ['fraction', '同分母分数'], ['decimal', '一位小数'], ['remainder', '有余数除法'],
]
export const allMultiplicationTables = [2, 3, 4, 5, 6, 7, 8, 9]

function makeProblem(type: ProblemType, settings: AppSettings, random: () => number): Problem | null {
  if (type === 'calculation') return calculation(settings, random)
  if (type === 'missing') return missing(settings, random)
  if (type === 'comparison') return comparison(settings, random)
  if (type === 'operator') return operatorProblem(settings, random)
  if (type === 'multiplication') return multiplication(settings, random)
  if (type === 'vertical') return vertical(settings, random)
  if (type === 'remainder') return remainderProblem(settings, random)
  if (type === 'time') return timeProblem(settings, random)
  if (type === 'money') return moneyProblem(settings, random)
  if (type === 'unit') return unitProblem(settings, random)
  if (type === 'fraction') return fractionProblem(settings, random)
  return decimalProblem(settings, random)
}

function keyFor(problem: Problem): string {
  const node = problem.expression
  if (problem.type === 'calculation' && node?.kind === 'operation' &&
      node.left.kind === 'number' && node.right.kind === 'number' &&
      (node.operator === '+' || node.operator === '×')) {
    return `${problem.type}:${node.operator}:${Math.min(node.left.value, node.right.value)}:${Math.max(node.left.value, node.right.value)}`
  }
  return `${problem.type}:${problem.question ?? problem.text}`
}

export function generateMixedWorksheet(settings: AppSettings, random: () => number = Math.random): Worksheet {
  // v4 sheets and the settings UI share this 2–200 cap; legacy decoders in worksheet-link still accept larger v1–v3 limits.
  if (!Number.isInteger(settings.limit) || settings.limit < 2 || settings.limit > 200) {
    throw new Error('新试卷的数字范围必须是 2～200 的整数。')
  }
  if (![50, 100].includes(settings.count) || ![2, 3, 4].includes(settings.operands)) throw new Error('题量或数字个数无效。')
  if (!settings.operations.length || settings.operations.some((operator) => !specialtyOperations.includes(operator))) {
    throw new Error('请至少选择一种有效的运算方式。')
  }
  if (!['any', 'without-carry', 'with-carry'].includes(settings.additionRegrouping) ||
      !['any', 'without-borrow', 'with-borrow'].includes(settings.subtractionRegrouping)) throw new Error('进退位规则无效。')
  if (!settings.problemTypes.length) throw new Error('请至少选择一种题型。')
  if (new Set(settings.problemTypes).size !== settings.problemTypes.length ||
      settings.problemTypes.some((type) => !problemTypeOptions.some(([candidate]) => candidate === type))) {
    throw new Error('题型设置无效。')
  }
  if (settings.multiplicationTables.some((table) => !allMultiplicationTables.includes(table))) throw new Error('口诀段必须为 2～9。')
  if (settings.problemTypes.includes('multiplication') && !settings.multiplicationTables.length) {
    throw new Error('口诀专项请至少选择一段口诀。')
  }
  const canonicalSettings: AppSettings = {
    ...settings,
    operations: specialtyOperations.filter((operation) => settings.operations.includes(operation)),
    problemTypes: problemTypeOptions.map(([type]) => type).filter((type) => settings.problemTypes.includes(type)),
    multiplicationTables: allMultiplicationTables.filter((table) => settings.multiplicationTables.includes(table)),
  }
  const plan = Array.from({ length: settings.count }, (_, index) =>
    canonicalSettings.problemTypes[index % canonicalSettings.problemTypes.length])
  for (let index = plan.length - 1; index > 0; index--) {
    const target = randomInt(0, index, random)
    ;[plan[index], plan[target]] = [plan[target], plan[index]]
  }

  const problems: Problem[] = []
  const seen = new Set<string>()
  let repeated = 0
  for (const type of plan) {
    let selected: Problem | null = null
    for (let attempt = 0; attempt < 160; attempt++) {
      const candidate = makeProblem(type, canonicalSettings, random)
      if (!candidate) continue
      selected = candidate
      if (!seen.has(keyFor(candidate))) break
    }
    if (!selected) throw new Error(`当前设置无法生成“${problemTypeOptions.find(([candidate]) => candidate === type)?.[1]}”题型，请调整条件。`)
    const key = keyFor(selected)
    if (seen.has(key)) repeated++
    seen.add(key)
    problems.push(selected)
  }
  return { problems, repeated }
}
