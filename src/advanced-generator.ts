import {
  generateCalculationProblem,
  type Problem,
  type ProblemType,
  type Settings,
  type Worksheet,
  type Operation,
  type Expression,
} from './generator'

export interface AppSettings extends Settings {
  problemTypes: ProblemType[]
  multiplicationTables: number[]
}

const operations: Operation[] = ['+', '−', '×', '÷']
// Order is part of the v4 QR format. Append new types; never reorder these entries.
export const problemTypeOptions: Array<[ProblemType, string]> = [
  ['calculation', '口算'], ['missing', '填空题'], ['comparison', '比较大小'],
  ['operator', '填运算符'], ['multiplication', '九九口诀'], ['vertical', '竖式计算'],
  ['time', '时间'], ['money', '人民币'], ['unit', '单位换算'],
  ['fraction', '同分母分数'], ['decimal', '一位小数'], ['remainder', '有余数除法'],
]
export const allMultiplicationTables = [2, 3, 4, 5, 6, 7, 8, 9]

const randomInt = (min: number, max: number, random: () => number): number =>
  min + Math.floor(random() * (max - min + 1))

function pick<T>(values: T[], random: () => number): T {
  return values[randomInt(0, values.length - 1, random)]
}

function apply(operator: Operation, left: number, right: number): number | null {
  if (operator === '+') return left + right
  if (operator === '−') return left >= right ? left - right : null
  if (operator === '×') return left * right
  return right !== 0 && left % right === 0 ? left / right : null
}

function calculation(settings: AppSettings, random: () => number): Problem {
  return { ...generateCalculationProblem(settings, random), type: 'calculation' }
}

// Evaluate a replacement through the expression tree, never through display text.
// Reject undefined/fractional division and out-of-range intermediate values.
function replacementValue(expression: Expression, position: number, replacement: number, limit: number): number | null {
  let leaf = 0
  const visit = (node: Expression): number | null => {
    if (node.kind === 'number') return leaf++ === position ? replacement : node.value
    const left = visit(node.left)
    const right = visit(node.right)
    if (left === null || right === null) return null
    const value = apply(node.operator, left, right)
    return value !== null && value >= 0 && value <= limit ? value : null
  }
  return visit(expression)
}

function missing(settings: AppSettings, random: () => number): Problem {
  const base = generateCalculationProblem(settings, random)
  const tokens = base.text.split(' ')
  const numberIndexes = tokens.map((_, index) => index).filter((index) => index % 2 === 0)
  const uniquePositions = numberIndexes.map((_, position) => position).filter((position) => {
    if (!base.expression) return false
    let solutions = 0
    for (let value = 0; value <= settings.limit; value++) {
      if (replacementValue(base.expression, position, value, settings.limit) === base.answer) solutions++
      if (solutions > 1) return false
    }
    return solutions === 1
  })
  const hiddenPosition = pick([...uniquePositions, numberIndexes.length], random)
  const solution = `${base.text} = ${base.answer}`
  if (hiddenPosition === numberIndexes.length) {
    return {
      type: 'missing', text: `${base.text} = □`, question: `${base.text} = □`,
      answer: base.answer, solution,
    }
  }
  const tokenIndex = numberIndexes[hiddenPosition]
  const answer = Number(tokens[tokenIndex])
  tokens[tokenIndex] = '□'
  const question = `${tokens.join(' ')} = ${base.answer}`
  return { type: 'missing', text: question, question, answer, solution }
}

function comparison(settings: AppSettings, random: () => number): Problem {
  const useExpression = random() < 0.5
  const base = useExpression ? generateCalculationProblem(settings, random) : null
  const leftValue = base ? Number(base.answer) : randomInt(0, settings.limit, random)
  const right = random() < 0.25 ? leftValue : randomInt(0, settings.limit, random)
  const answer = leftValue > right ? '＞' : leftValue < right ? '＜' : '＝'
  const leftText = base?.text ?? String(leftValue)
  const question = `${leftText} ○ ${right}`
  return { type: 'comparison', text: question, question, answer, solution: `${leftText} ${answer} ${right}` }
}

function operatorProblem(settings: AppSettings, random: () => number): Problem | null {
  for (let attempt = 0; attempt < 500; attempt++) {
    const left = randomInt(1, settings.limit, random)
    const right = randomInt(1, settings.limit, random)
    const operator = pick(operations, random)
    const result = apply(operator, left, right)
    if (result === null || result < 0 || result > settings.limit || !Number.isInteger(result)) continue
    const matches = operations.filter((candidate) => apply(candidate, left, right) === result)
    if (matches.length !== 1 || matches[0] !== operator) continue
    const question = `${left} ○ ${right} = ${result}`
    return {
      type: 'operator', text: question, question, answer: operator,
      solution: `${left} ${operator} ${right} = ${result}`,
    }
  }
  return null
}

function multiplication(settings: AppSettings, random: () => number): Problem {
  const table = pick(settings.multiplicationTables, random)
  const factor = randomInt(2, 9, random)
  const product = table * factor
  const mode = randomInt(0, 3, random)
  if (mode === 0) {
    const question = `${table} × ${factor} = □`
    return { type: 'multiplication', text: question, question, answer: product, solution: `${table} × ${factor} = ${product}` }
  }
  if (mode === 1) {
    const question = `${product} ÷ ${table} = □`
    return { type: 'multiplication', text: question, question, answer: factor, solution: `${product} ÷ ${table} = ${factor}` }
  }
  if (mode === 2) {
    const question = `□ × ${factor} = ${product}`
    return { type: 'multiplication', text: question, question, answer: table, solution: `${table} × ${factor} = ${product}` }
  }
  const question = `${table} × □ = ${product}`
  return { type: 'multiplication', text: question, question, answer: factor, solution: `${table} × ${factor} = ${product}` }
}

function vertical(settings: AppSettings, random: () => number): Problem {
  const verticalSettings: AppSettings = { ...settings, operands: 2 }
  const base = generateCalculationProblem(verticalSettings, random)
  const node = base.expression
  if (!node || node.kind !== 'operation') throw new Error('竖式表达式无效。')
  const top = node.left.value
  const bottom = node.right.value
  const operator = node.operator
  return {
    type: 'vertical', text: `竖式 ${base.text}`, question: `竖式 ${base.text}`,
    answer: base.answer, solution: `${base.text} = ${base.answer}`,
    vertical: { top, bottom, operator },
  }
}

function remainderProblem(settings: AppSettings, random: () => number): Problem {
  if (settings.limit < 3) throw new Error('有余数除法至少需要 3 以内的范围，请扩大数字范围。')
  const divisor = randomInt(2, Math.min(9, settings.limit - 1), random)
  const maximumQuotient = Math.floor((settings.limit - 1) / divisor)
  const quotient = randomInt(1, maximumQuotient, random)
  const remainder = randomInt(1, Math.min(divisor - 1, settings.limit - quotient * divisor), random)
  const dividend = quotient * divisor + remainder
  const question = `${dividend} ÷ ${divisor} = □ …… □`
  const answer = `${quotient} …… ${remainder}`
  return { type: 'remainder', text: question, question, answer, solution: `${dividend} ÷ ${divisor} = ${answer}` }
}

function timeProblem(_settings: AppSettings, random: () => number): Problem {
  if (random() < 0.45) {
    const hours = randomInt(1, 12, random)
    const question = `${hours} 时 = □ 分`
    return { type: 'time', text: question, question, answer: hours * 60, solution: `${hours} 时 = ${hours * 60} 分` }
  }
  const hour = randomInt(0, 21, random)
  const minute = pick([0, 30], random)
  const duration = pick([30, 60, 90], random)
  const total = hour * 60 + minute + duration
  const endHour = Math.floor(total / 60)
  const endMinute = total % 60
  const start = `${hour}:${String(minute).padStart(2, '0')}`
  const answer = `${endHour}:${String(endMinute).padStart(2, '0')}`
  const question = `${start} 过 ${duration} 分是 □（24 时制）`
  return { type: 'time', text: question, question, answer, solution: `${start} 过 ${duration} 分是 ${answer}` }
}

function moneyProblem(_settings: AppSettings, random: () => number): Problem {
  const mode = randomInt(0, 3, random)
  if (mode < 2) {
    const total = randomInt(1, 2000, random)
    const yuan = Math.floor(total / 100)
    const jiao = Math.floor(total % 100 / 10)
    const fen = total % 10
    if (mode === 0) {
      const question = `${yuan} 元 ${jiao} 角 ${fen} 分 = □ 分`
      return { type: 'money', text: question, question, answer: total, solution: `${yuan} 元 ${jiao} 角 ${fen} 分 = ${total} 分` }
    }
    const answer = `${yuan} 元 ${jiao} 角 ${fen} 分`
    const question = `${total} 分 = □ 元 □ 角 □ 分`
    return { type: 'money', text: question, question, answer, solution: `${total} 分 = ${answer}` }
  }
  const jiao = randomInt(10, 200, random)
  const answer = `${Math.floor(jiao / 10)} 元 ${jiao % 10} 角`
  if (mode === 2) {
    const question = `${jiao} 角 = □ 元 □ 角`
    return { type: 'money', text: question, question, answer, solution: `${jiao} 角 = ${answer}` }
  }
  const question = `${Math.floor(jiao / 10)} 元 ${jiao % 10} 角 = □ 角`
  return { type: 'money', text: question, question, answer: jiao, solution: `${Math.floor(jiao / 10)} 元 ${jiao % 10} 角 = ${jiao} 角` }
}

function unitProblem(_settings: AppSettings, random: () => number): Problem {
  const conversions: Array<[string, string, number]> = [
    ['米', '厘米', 100], ['千米', '米', 1000], ['千克', '克', 1000],
    ['分米', '厘米', 10], ['厘米', '毫米', 10],
  ]
  const conversion = pick(conversions, random)
  const amount = randomInt(1, 9, random)
  const answer = amount * conversion[2]
  if (random() < 0.5) {
    const question = `${amount} ${conversion[0]} = □ ${conversion[1]}`
    return { type: 'unit', text: question, question, answer, solution: `${amount} ${conversion[0]} = ${answer} ${conversion[1]}` }
  }
  const question = `${answer} ${conversion[1]} = □ ${conversion[0]}`
  return { type: 'unit', text: question, question, answer: amount, solution: `${answer} ${conversion[1]} = ${amount} ${conversion[0]}` }
}

function gcd(left: number, right: number): number {
  while (right) [left, right] = [right, left % right]
  return left
}

function fractionProblem(_settings: AppSettings, random: () => number): Problem {
  const denominator = randomInt(2, 9, random)
  const operator = random() < 0.5 ? '+' : '−'
  let left = randomInt(1, denominator, random)
  let right = randomInt(1, denominator, random)
  if (operator === '+') {
    left = randomInt(1, denominator - 1, random)
    right = randomInt(1, denominator - left, random)
  } else if (right > left) {
    [left, right] = [right, left]
  }
  const numerator = operator === '+' ? left + right : left - right
  const divisor = numerator === 0 ? denominator : gcd(numerator, denominator)
  const answer = numerator === 0 ? '0' : numerator === denominator ? '1' : `${numerator / divisor}/${denominator / divisor}`
  const question = `${left}/${denominator} ${operator} ${right}/${denominator} = □`
  return { type: 'fraction', text: question, question, answer, solution: `${left}/${denominator} ${operator} ${right}/${denominator} = ${answer}` }
}

function decimalProblem(settings: AppSettings, random: () => number): Problem {
  const maximum = Math.max(2, settings.limit * 10)
  const operator = random() < 0.5 ? '+' : '−'
  let left: number
  let right: number
  if (operator === '+') {
    left = randomInt(1, maximum - 1, random)
    right = randomInt(1, maximum - left, random)
  } else {
    left = randomInt(1, maximum, random)
    right = randomInt(1, left, random)
  }
  const result = operator === '+' ? left + right : left - right
  const leftText = (left / 10).toFixed(1)
  const rightText = (right / 10).toFixed(1)
  const answer = (result / 10).toFixed(1)
  const question = `${leftText} ${operator} ${rightText} = □`
  return { type: 'decimal', text: question, question, answer, solution: `${leftText} ${operator} ${rightText} = ${answer}` }
}

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
  if (!Number.isInteger(settings.limit) || settings.limit < 2 || settings.limit > 200) {
    throw new Error('新试卷的数字范围必须是 2～200 的整数。')
  }
  if (![50, 100].includes(settings.count) || ![2, 3, 4].includes(settings.operands)) throw new Error('题量或数字个数无效。')
  if (!settings.operations.length || settings.operations.some((operator) => !operations.includes(operator))) {
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
  // Canonicalize input order so checkbox order and QR mask decoding reproduce identically.
  const canonicalSettings: AppSettings = {
    ...settings,
    operations: operations.filter((operation) => settings.operations.includes(operation)),
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
