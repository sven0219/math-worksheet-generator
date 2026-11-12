import {
  generateCalculationProblem,
  type Expression,
  type Problem,
} from '../generator'
import type { AppSettings } from '../app-settings'
import { apply, pick, randomInt, specialtyOperations } from './utils'

export function calculation(settings: AppSettings, random: () => number): Problem {
  return { ...generateCalculationProblem(settings, random), type: 'calculation' }
}

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

export function missing(settings: AppSettings, random: () => number): Problem {
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

export function comparison(settings: AppSettings, random: () => number): Problem {
  const useExpression = random() < 0.5
  const base = useExpression ? generateCalculationProblem(settings, random) : null
  const leftValue = base ? Number(base.answer) : randomInt(0, settings.limit, random)
  const right = random() < 0.25 ? leftValue : randomInt(0, settings.limit, random)
  const answer = leftValue > right ? '＞' : leftValue < right ? '＜' : '＝'
  const leftText = base?.text ?? String(leftValue)
  const question = `${leftText} ○ ${right}`
  return { type: 'comparison', text: question, question, answer, solution: `${leftText} ${answer} ${right}` }
}

export function operatorProblem(settings: AppSettings, random: () => number): Problem | null {
  for (let attempt = 0; attempt < 500; attempt++) {
    const left = randomInt(1, settings.limit, random)
    const right = randomInt(1, settings.limit, random)
    const operator = pick(specialtyOperations, random)
    const result = apply(operator, left, right)
    if (result === null || result < 0 || result > settings.limit || !Number.isInteger(result)) continue
    const matches = specialtyOperations.filter((candidate) => apply(candidate, left, right) === result)
    if (matches.length !== 1 || matches[0] !== operator) continue
    const question = `${left} ○ ${right} = ${result}`
    return {
      type: 'operator', text: question, question, answer: operator,
      solution: `${left} ${operator} ${right} = ${result}`,
    }
  }
  return null
}

export function multiplication(settings: AppSettings, random: () => number): Problem {
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

export function vertical(settings: AppSettings, random: () => number): Problem {
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

export function remainderProblem(settings: AppSettings, random: () => number): Problem {
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
