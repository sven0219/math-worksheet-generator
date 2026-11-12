import type { Problem } from '../generator'
import type { AppSettings } from '../app-settings'
import { pick, randomInt } from './utils'

export function timeProblem(_settings: AppSettings, random: () => number): Problem {
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

export function moneyProblem(_settings: AppSettings, random: () => number): Problem {
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

export function unitProblem(_settings: AppSettings, random: () => number): Problem {
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

export function fractionProblem(_settings: AppSettings, random: () => number): Problem {
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

export function decimalProblem(settings: AppSettings, random: () => number): Problem {
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
