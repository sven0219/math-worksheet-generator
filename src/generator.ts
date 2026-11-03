export type Operation = '+' | '−' | '×' | '÷'
export type OperandCount = 2 | 3 | 4

export interface Settings {
  count: 50 | 100
  limit: number
  operations: Operation[]
  operands: OperandCount
}

export type Expression =
  | { kind: 'number'; value: number }
  | { kind: 'operation'; operator: Operation; left: Expression; right: Expression; value: number }

export interface Problem {
  expression: Expression
  text: string
  answer: number
}

export interface Worksheet {
  problems: Problem[]
  repeated: number
}

const randomInt = (min: number, max: number, random: () => number): number =>
  min + Math.floor(random() * (max - min + 1))

export function formatExpression(expression: Expression, nested = false): string {
  if (expression.kind === 'number') return String(expression.value)
  const left = formatExpression(expression.left, expression.left.kind === 'operation')
  const right = formatExpression(expression.right)
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

function makeProblem(settings: Settings, random: () => number): Problem {
  let expression: Expression = {
    kind: 'number',
    value: randomInt(1, settings.limit, random),
  }

  for (let step = 1; step < settings.operands; step++) {
    const available = settings.operations
      .map((operator) => ({ operator, choices: options(operator, expression.value, settings.limit) }))
      .filter(({ choices }) => choices.length > 0)

    // At a boundary, a harmless identity is preferable to a negative or fractional answer.
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

  return { expression, text: formatExpression(expression), answer: expression.value }
}

function keyFor(problem: Problem): string {
  const node = problem.expression
  if (node.kind === 'operation' && node.left.kind === 'number' &&
      node.right.kind === 'number' && (node.operator === '+' || node.operator === '×')) {
    return `${node.operator}:${Math.min(node.left.value, node.right.value)}:${Math.max(node.left.value, node.right.value)}`
  }
  return problem.text
}

export function generateWorksheet(settings: Settings, random: () => number = Math.random): Worksheet {
  if (!Number.isInteger(settings.limit) || settings.limit < 2 || settings.limit > 1000) {
    throw new Error('数字范围必须是 2 到 1000 之间的整数')
  }
  if (!settings.operations.length) throw new Error('请至少选择一种运算方式')
  const problems: Problem[] = []
  const seen = new Set<string>()
  const attempts = settings.count * 80

  for (let i = 0; i < attempts && problems.length < settings.count; i++) {
    const problem = makeProblem(settings, random)
    const key = keyFor(problem)
    if (seen.has(key)) continue
    seen.add(key)
    problems.push(problem)
  }

  const unique = problems.length
  // Some combinations, e.g. 10以内 / only division / 100 questions, have too few distinct expressions.
  while (problems.length < settings.count) {
    problems.push(problems[randomInt(0, unique - 1, random)])
  }

  return { problems, repeated: settings.count - unique }
}
