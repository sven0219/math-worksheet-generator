import test from 'node:test'
import assert from 'node:assert/strict'
import { advanced, generator, links, view } from './modules.mjs'

const settings = (overrides = {}) => ({
  count: 100, limit: 200, operations: ['+', '−', '×', '÷'], operands: 4,
  additionRegrouping: 'any', subtractionRegrouping: 'any',
  problemTypes: ['calculation'], multiplicationTables: [2, 3, 4, 5, 6, 7, 8, 9],
  ...overrides,
})
const seeded = links.seededRandom
const apply = (operator, left, right) => {
  if (operator === '+') return left + right
  if (operator === '−') return left - right
  if (operator === '×') return left * right
  if (right === 0 || left % right !== 0) return NaN
  return left / right
}
const inRange = (value, limit = 200) => {
  assert(Number.isInteger(value) && value >= 0 && value <= limit, `out of range: ${value}`)
}
function evaluateTokens(tokens, limit = 200) {
  let term = Number(tokens[0])
  let total = 0
  let pending = '+'
  inRange(term, limit)
  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index]
    const next = Number(tokens[index + 1])
    inRange(next, limit)
    if (operator === '×' || operator === '÷') {
      term = apply(operator, term, next)
      inRange(term, limit)
    } else {
      total = apply(pending, total, term)
      inRange(total, limit)
      pending = operator
      term = next
    }
  }
  total = apply(pending, total, term)
  inRange(total, limit)
  return total
}
function validate(problem, configuration) {
  const { type, question, answer } = problem
  const limit = configuration.limit
  assert(!/[()]/.test(question ?? problem.text), 'new problems have no parentheses')
  if (type === 'calculation') {
    assert.equal(evaluateTokens(problem.text.split(' '), limit), answer)
  } else if (type === 'missing') {
    const [left, right] = question.split(' = ')
    if (right === '□') assert.equal(evaluateTokens(left.split(' '), limit), answer)
    else {
      let matches = 0
      for (let candidate = 0; candidate <= limit; candidate++) {
        try {
          if (evaluateTokens(left.replace('□', String(candidate)).split(' '), limit) === Number(right)) {
            assert.equal(candidate, answer)
            matches++
          }
        } catch (cause) {
          // Invalid intermediate results are not admissible solutions.
          if (!String(cause.message).includes('out of range')) throw cause
        }
      }
      assert.equal(matches, 1, `non-unique missing operand: ${question}`)
    }
  } else if (type === 'comparison') {
    const [left, right] = question.split(' ○ ')
    const value = evaluateTokens(left.split(' '), limit)
    assert.equal(answer, value > Number(right) ? '＞' : value < Number(right) ? '＜' : '＝')
  } else if (type === 'operator') {
    const match = /^(\d+) ○ (\d+) = (\d+)$/.exec(question)
    const [, left, right, result] = match.map(Number)
    const matches = ['+', '−', '×', '÷'].filter((operation) => apply(operation, left, right) === result)
    assert.deepEqual(matches, [answer], `ambiguous operator: ${question}`)
    inRange(result, limit)
  } else if (type === 'multiplication') {
    const solved = question.replace('□', String(answer))
    const [left, right] = solved.split(' = ')
    assert.equal(evaluateTokens(left.split(' '), 81), Number(right))
    const factors = problem.solution.match(/^(\d+) × (\d+) =/)
    const division = problem.solution.match(/^\d+ ÷ (\d+) =/)
    assert(configuration.multiplicationTables.includes(Number((factors ?? division)[1])))
  } else if (type === 'vertical') {
    const { top, bottom, operator } = problem.vertical
    assert.equal(apply(operator, top, bottom), answer)
    inRange(top, limit); inRange(bottom, limit); inRange(answer, limit)
    assert(view.verticalMarkup(problem).includes(operator === '÷' ? 'division-dividend' : 'vertical-bottom'))
  } else if (type === 'remainder') {
    const [dividend, divisor] = question.match(/\d+/g).map(Number)
    const [quotient, remainder] = answer.match(/\d+/g).map(Number)
    assert.equal(quotient * divisor + remainder, dividend)
    assert(divisor > 0 && quotient > 0 && remainder > 0 && remainder < divisor)
    for (const number of [dividend, divisor, quotient, remainder]) inRange(number, limit)
  } else if (type === 'decimal') {
    const [, left, operator, right] = /^(\d+\.\d) ([+−]) (\d+\.\d) = □$/.exec(question)
    const scaledLeft = Math.round(Number(left) * 10)
    const scaledRight = Math.round(Number(right) * 10)
    const result = apply(operator, scaledLeft, scaledRight)
    assert.equal(answer, (result / 10).toFixed(1))
    inRange(result, limit * 10)
  } else if (type === 'fraction') {
    const [, left, denominator, operator, right, secondDenominator] = /^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+) = □$/.exec(question)
    assert.equal(denominator, secondDenominator)
    const [numerator, divisor = '1'] = String(answer).split('/')
    assert.equal(Number(numerator) * Number(denominator), apply(operator, Number(left), Number(right)) * Number(divisor))
    assert(Number(numerator) / Number(divisor) >= 0 && Number(numerator) / Number(divisor) <= 1)
  } else if (type === 'time') {
    if (question.includes('24 时制')) {
      const [hours, minutes, duration] = question.match(/\d+/g).map(Number)
      const total = hours * 60 + minutes + duration
      assert.equal(answer, `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`)
    } else assert.equal(answer, Number(question.match(/^\d+/)[0]) * 60)
  } else if (type === 'money') {
    const toFen = (text) => [...text.matchAll(/(\d+) (元|角|分)/g)].reduce((total, match) =>
      total + Number(match[1]) * ({ 元: 100, 角: 10, 分: 1 })[match[2]], 0)
    const [left, right] = problem.solution.split(' = ')
    assert.equal(toFen(left), toFen(right))
    assert(toFen(left) <= 2000)
  } else if (type === 'unit') {
    const factor = { 千米: 1000000, 米: 1000, 分米: 100, 厘米: 10, 毫米: 1, 千克: 1000, 克: 1 }
    const [, amount, unit, result, target] = /^(\d+) (\S+) = (\d+) (\S+)$/.exec(problem.solution)
    assert.equal(Number(amount) * factor[unit], Number(result) * factor[target])
    assert(Number(amount) <= 9000 && Number(result) <= 9000)
  } else assert.fail(`unvalidated type: ${type}`)
}

test('all 12 types: range, arithmetic, unique blanks/operators and specialty conversions', () => {
  for (const [type] of advanced.problemTypeOptions) {
    for (const limit of [5, 20, 200]) {
      for (let seed = 0; seed < 5; seed++) {
        const configuration = settings({ problemTypes: [type], limit })
        const worksheet = advanced.generateMixedWorksheet(configuration, seeded(seed + 17))
        assert.equal(worksheet.problems.length, 100)
        for (const problem of worksheet.problems) validate(problem, configuration)
      }
    }
  }
})

test('balanced mixing, shuffled order, repeat accounting and v4 QR round trip', () => {
  const types = advanced.problemTypeOptions.map(([type]) => type)
  for (const count of [50, 100]) {
    const configuration = settings({ count, problemTypes: [...types].reverse() })
    const worksheet = advanced.generateMixedWorksheet(configuration, seeded(12345))
    const counts = types.map((type) => worksheet.problems.filter((problem) => problem.type === type).length)
    assert(Math.max(...counts) - Math.min(...counts) <= 1)
    assert(worksheet.problems.slice(0, 12).some((problem, index) => problem.type !== types[index]))
    const encoded = links.encodeSheet(configuration, 12345, 2)
    const decoded = links.decodeSheet(encoded)
    assert.equal(decoded.copy, 2)
    assert.deepEqual(decoded.sheet.worksheet, worksheet)
    for (const problem of worksheet.problems) validate(problem, configuration)
  }
  const configuration = settings({ count: 50, limit: 3, problemTypes: ['remainder'] })
  const worksheet = advanced.generateMixedWorksheet(configuration, seeded(2))
  assert.equal(worksheet.repeated, 49)
  assert.equal(new Set(worksheet.problems.map((problem) => problem.question)).size, 1)
})

test('v1/v2/v3 decoders preserve original generated worksheets', () => {
  for (const version of [1, 2, 3]) {
    for (const limit of [2, 20, 200, 1000]) {
      for (const operands of [2, 3, 4]) {
        const configuration = settings({ limit, operands })
        const generate = version === 1 ? generator.generateWorksheetV1 : version === 2 ? generator.generateWorksheetV2 : generator.generateWorksheet
        const expected = generate(configuration, seeded(19))
        const link = `${version}.100.${limit}.${operands}.15.${version === 3 ? '0.0.' : ''}j.1`
        const decoded = links.decodeSheet(link)
        assert(decoded, link)
        assert.deepEqual(decoded.sheet.worksheet, expected)
      }
    }
  }
})

test('strict carry/borrow settings still apply to every v4 calculation and vertical step', () => {
  const carries = (left, right) => {
    while (left || right) {
      if (left % 10 + right % 10 >= 10) return true
      left = Math.floor(left / 10); right = Math.floor(right / 10)
    }
    return false
  }
  const borrows = (left, right) => {
    while (left || right) {
      if (left % 10 < right % 10) return true
      left = Math.floor(left / 10); right = Math.floor(right / 10)
    }
    return false
  }
  const walk = (node, configuration) => {
    if (node.kind === 'number') return
    walk(node.left, configuration); walk(node.right, configuration)
    if (node.operator === '+') assert.equal(carries(node.left.value, node.right.value), configuration.additionRegrouping === 'with-carry')
    if (node.operator === '−') assert.equal(borrows(node.left.value, node.right.value), configuration.subtractionRegrouping === 'with-borrow')
  }
  for (const additionRegrouping of ['with-carry', 'without-carry']) {
    for (const subtractionRegrouping of ['with-borrow', 'without-borrow']) {
      const configuration = settings({ additionRegrouping, subtractionRegrouping, problemTypes: ['calculation', 'vertical'] })
      const worksheet = advanced.generateMixedWorksheet(configuration, seeded(2))
      for (const problem of worksheet.problems) {
        if (problem.expression) walk(problem.expression, configuration)
        if (problem.vertical?.operator === '+') assert.equal(carries(problem.vertical.top, problem.vertical.bottom), additionRegrouping === 'with-carry')
        if (problem.vertical?.operator === '−') assert.equal(borrows(problem.vertical.top, problem.vertical.bottom), subtractionRegrouping === 'with-borrow')
      }
    }
  }
})

test('invalid settings and damaged or impossible QR links fail safely', () => {
  for (const overrides of [
    { limit: 201 }, { count: 12 }, { operands: 5 }, { operations: [] }, { problemTypes: [] },
    { problemTypes: ['unknown'] }, { problemTypes: ['multiplication'], multiplicationTables: [] },
    { multiplicationTables: [12] }, { problemTypes: ['remainder'], limit: 2 },
    { limit: 5, problemTypes: ['calculation'], operations: ['+'], additionRegrouping: 'with-carry' },
  ]) assert.throws(() => advanced.generateMixedWorksheet(settings(overrides), seeded(1)))
  for (const link of [null, '', 'bad', '5.50.20.2.3.0.0.1.73.1.1',
    '4.50.201.2.3.0.0.1.73.1.1', '4.50.20.2.3.0.0.zzz.73.1.1',
    '4.50.20.2.3.0.0.1.zzz.1.1', '4.50.5.2.1.2.0.1.73.1.1',
    '4.50.20.2.3.0.0.1.73.zzzzzzzzzzzz.1', '4.50.20.2.3.0.0.g.0.1.1',
  ]) assert.equal(links.decodeSheet(link), null, String(link))
})

test('printed blanks and answer pages never expose malformed equality or HTML', () => {
  const worksheet = advanced.generateMixedWorksheet(settings({ problemTypes: advanced.problemTypeOptions.map(([type]) => type) }), seeded(3))
  for (const problem of worksheet.problems) {
    const question = view.questionText(problem)
    assert(!question.includes('= ='))
    if (problem.type === 'comparison') assert(!question.includes('='))
    if (problem.type !== 'calculation' && problem.type !== 'vertical' && problem.type !== 'comparison' && problem.type !== 'operator') assert(question.includes('□'))
    if (problem.type === 'operator') assert(question.includes('○'))
    assert(view.answerMarkup(problem).includes('shared-result'))
  }
  assert.equal(view.escapeHtml('<script>&'), '&lt;script&gt;&amp;')
  assert.equal(view.worksheetColumnCount(worksheet.problems, 4, 200), 2)
  assert.equal(view.worksheetColumnCount(worksheet.problems.filter((problem) => problem.vertical), 4, 200), 5)
  assert.equal(view.worksheetSubtitle(settings({ problemTypes: advanced.problemTypeOptions.map(([type]) => type) })), '综合练习 · 12 种题型')
})
