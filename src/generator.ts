export type Operation = '+' | '−' | '×' | '÷'
export type OperandCount = 2 | 3 | 4
export type AdditionRegrouping = 'any' | 'without-carry' | 'with-carry'
export type SubtractionRegrouping = 'any' | 'without-borrow' | 'with-borrow'
export type ProblemType =
  | 'calculation' | 'missing' | 'comparison' | 'operator' | 'multiplication'
  | 'vertical' | 'remainder' | 'time' | 'money' | 'unit' | 'fraction' | 'decimal'

export interface Settings {
  count: 50 | 100
  limit: number
  operations: Operation[]
  operands: OperandCount
  additionRegrouping: AdditionRegrouping
  subtractionRegrouping: SubtractionRegrouping
}

export type Expression =
  | { kind: 'number'; value: number }
  | { kind: 'operation'; operator: Operation; left: Expression; right: Expression; value: number }

export interface Problem {
  expression?: Expression
  text: string
  answer: number | string
  type?: ProblemType
  question?: string
  solution?: string
  vertical?: { top: number; bottom: number; operator: Operation }
}

export interface Worksheet {
  problems: Problem[]
  repeated: number
}

const randomInt = (min: number, max: number, random: () => number): number =>
  min + Math.floor(random() * (max - min + 1))

export function formatExpression(expression: Expression): string {
  if (expression.kind === 'number') return String(expression.value)
  const left = formatExpression(expression.left)
  const right = formatExpression(expression.right)
  return `${left} ${expression.operator} ${right}`
}

function formatLegacyExpression(expression: Expression, nested = false): string {
  if (expression.kind === 'number') return String(expression.value)
  const left = formatLegacyExpression(expression.left, expression.left.kind === 'operation')
  const right = formatLegacyExpression(expression.right)
  const result = `${left} ${expression.operator} ${right}`
  return nested ? `(${result})` : result
}

// Select a valid right operand rather than generating invalid questions and fixing them later.
function options(operator: Operation, current: number, limit: number): number[] {
  switch (operator) {
    case '+':
      return Array.from({ length: limit - current }, (_, i) => i + 1)
    case '−':
      return Array.from({ length: current }, (_, i) => i + 1)
    case '×':
      return current === 0
        ? Array.from({ length: limit }, (_, i) => i + 1)
        : Array.from({ length: Math.floor(limit / current) - 1 }, (_, i) => i + 2)
    case '÷':
      return current === 0
        ? []
        : Array.from({ length: current - 1 }, (_, i) => i + 2).filter(
            (divisor) => current % divisor === 0,
          )
  }
}

function apply(operator: Operation, left: number, right: number): number {
  switch (operator) {
    case '+': return left + right
    case '−': return left - right
    case '×': return left * right
    case '÷': return left / right
  }
}

function hasHighPrecedence(operator: Operation): boolean {
  return operator === '×' || operator === '÷'
}

function hasCarry(left: number, right: number): boolean {
  while (left > 0 || right > 0) {
    if (left % 10 + right % 10 >= 10) return true
    left = Math.floor(left / 10)
    right = Math.floor(right / 10)
  }
  return false
}

function hasBorrow(left: number, right: number): boolean {
  while (left > 0 || right > 0) {
    if (left % 10 < right % 10) return true
    left = Math.floor(left / 10)
    right = Math.floor(right / 10)
  }
  return false
}

function matchesRegrouping(
  operator: Operation,
  left: number,
  right: number,
  settings: Settings,
): boolean {
  if (operator === '+') {
    const carries = hasCarry(left, right)
    return settings.additionRegrouping === 'any' ||
      (settings.additionRegrouping === 'with-carry' ? carries : !carries)
  }
  if (operator === '−') {
    const borrows = hasBorrow(left, right)
    return settings.subtractionRegrouping === 'any' ||
      (settings.subtractionRegrouping === 'with-borrow' ? borrows : !borrows)
  }
  return true
}

function makeProblem(
  settings: Settings,
  random: () => number,
  enforceRegrouping: boolean,
): Problem | null {
  let term: Expression = {
    kind: 'number',
    value: randomInt(1, settings.limit, random),
  }
  let expression: Expression = term
  let completed: Expression | null = null
  let pending: Operation | null = null

  for (let step = 1; step < settings.operands; step++) {
    // Keep the current multiplication/division term separate from the completed
    // addition/subtraction side so the tree follows conventional precedence.
    const available = settings.operations
      .map((operator) => ({
        operator,
        choices: hasHighPrecedence(operator)
          ? options(operator, term.value, settings.limit).filter((operand) => {
              const nextTerm = apply(operator, term.value, operand)
              if (completed === null || pending === null) return true
              const nextValue = apply(pending, completed.value, nextTerm)
              return Number.isInteger(nextValue) && nextValue >= 0 && nextValue <= settings.limit &&
                (!enforceRegrouping || matchesRegrouping(pending, completed.value, nextTerm, settings))
            })
          : options(operator, expression.value, settings.limit).filter((operand) =>
              !enforceRegrouping || matchesRegrouping(operator, expression.value, operand, settings)),
      }))
      .filter(({ choices }) => choices.length > 0)

    // At a boundary, a harmless identity is preferable to a negative or fractional answer.
    const fallbackOperations = settings.operations.filter((operator) => {
      if (!enforceRegrouping) return true
      if (!hasHighPrecedence(operator)) return matchesRegrouping(operator, expression.value, 0, settings)
      if (completed === null || pending === null) return true
      return matchesRegrouping(pending, completed.value, term.value, settings)
    })
    if (!available.length && !fallbackOperations.length) return null
    const selected = available.length
      ? available[randomInt(0, available.length - 1, random)]
      : { operator: fallbackOperations[randomInt(0, fallbackOperations.length - 1, random)], choices: [] }
    const operand = selected.choices.length
      ? selected.choices[randomInt(0, selected.choices.length - 1, random)]
      : hasHighPrecedence(selected.operator) ? 1 : 0
    const operandExpression: Expression = { kind: 'number', value: operand }

    if (hasHighPrecedence(selected.operator)) {
      term = {
        kind: 'operation',
        operator: selected.operator,
        left: term,
        right: operandExpression,
        value: apply(selected.operator, term.value, operand),
      }
      expression = completed !== null && pending !== null
        ? {
            kind: 'operation',
            operator: pending,
            left: completed,
            right: term,
            value: apply(pending, completed.value, term.value),
          }
        : term
    } else {
      completed = expression
      pending = selected.operator
      term = operandExpression
      expression = {
        kind: 'operation',
        operator: selected.operator,
        left: completed,
        right: term,
        value: apply(selected.operator, completed.value, term.value),
      }
    }
  }

  return { expression, text: formatExpression(expression), answer: expression.value }
}

// Keep the original algorithm for QR links printed before unparenthesized expressions.
function makeLegacyProblem(settings: Settings, random: () => number): Problem {
  let expression: Expression = {
    kind: 'number',
    value: randomInt(1, settings.limit, random),
  }

  for (let step = 1; step < settings.operands; step++) {
    const available = settings.operations
      .map((operator) => ({ operator, choices: options(operator, expression.value, settings.limit) }))
      .filter(({ choices }) => choices.length > 0)

    const selected = available.length
      ? available[randomInt(0, available.length - 1, random)]
      : { operator: settings.operations[randomInt(0, settings.operations.length - 1, random)], choices: [] }
    const operand = selected.choices.length
      ? selected.choices[randomInt(0, selected.choices.length - 1, random)]
      : selected.operator === '×' || selected.operator === '÷' ? 1 : 0
    const result = apply(selected.operator, expression.value, operand)
    expression = {
      kind: 'operation',
      operator: selected.operator,
      left: expression,
      right: { kind: 'number', value: operand },
      value: result,
    }
  }

  return { expression, text: formatLegacyExpression(expression), answer: expression.value }
}

function keyFor(problem: Problem): string {
  const node = problem.expression
  if (node?.kind === 'operation' && node.left.kind === 'number' &&
      node.right.kind === 'number' && (node.operator === '+' || node.operator === '×')) {
    return `${node.operator}:${Math.min(node.left.value, node.right.value)}:${Math.max(node.left.value, node.right.value)}`
  }
  return problem.text
}

function generate(
  settings: Settings,
  random: () => number,
  problemFactory: (settings: Settings, random: () => number) => Problem | null,
): Worksheet {
  // v1–v3 QR links may encode limits up to 1000; the interactive UI caps new sheets at 200.
  if (!Number.isInteger(settings.limit) || settings.limit < 2 || settings.limit > 1000) {
    throw new Error('数字范围必须是 2 到 1000 之间的整数')
  }
  if (!settings.operations.length) throw new Error('请至少选择一种运算方式')
  const problems: Problem[] = []
  const seen = new Set<string>()
  const attempts = settings.count * 80

  for (let i = 0; i < attempts && problems.length < settings.count; i++) {
    const problem = problemFactory(settings, random)
    if (!problem) continue
    const key = keyFor(problem)
    if (seen.has(key)) continue
    seen.add(key)
    problems.push(problem)
  }

  const unique = problems.length
  if (!unique) {
    throw new Error('当前数字范围、运算方式和进退位设置无法生成题目，请放宽条件。')
  }
  // Some combinations, e.g. 10以内 / only division / 100 questions, have too few distinct expressions.
  while (problems.length < settings.count) {
    problems.push(problems[randomInt(0, unique - 1, random)])
  }

  return { problems, repeated: settings.count - unique }
}

export function generateWorksheet(settings: Settings, random: () => number = Math.random): Worksheet {
  return generate(settings, random, (currentSettings, currentRandom) =>
    makeProblem(currentSettings, currentRandom, true))
}

export function generateCalculationProblem(settings: Settings, random: () => number = Math.random): Problem {
  for (let attempt = 0; attempt < 100; attempt++) {
    const problem = makeProblem(settings, random, true)
    if (problem) return problem
  }
  throw new Error('当前设置无法生成计算题，请放宽数字范围或进退位规则。')
}

export function generateWorksheetV2(settings: Settings, random: () => number = Math.random): Worksheet {
  return generate(settings, random, (currentSettings, currentRandom) =>
    makeProblem(currentSettings, currentRandom, false))
}

export function generateWorksheetV1(settings: Settings, random: () => number = Math.random): Worksheet {
  return generate(settings, random, makeLegacyProblem)
}
