import type { Operation } from '../generator'

export const specialtyOperations: Operation[] = ['+', '−', '×', '÷']

export const randomInt = (min: number, max: number, random: () => number): number =>
  min + Math.floor(random() * (max - min + 1))

export function pick<T>(values: T[], random: () => number): T {
  return values[randomInt(0, values.length - 1, random)]
}

export function apply(operator: Operation, left: number, right: number): number | null {
  if (operator === '+') return left + right
  if (operator === '−') return left >= right ? left - right : null
  if (operator === '×') return left * right
  return right !== 0 && left % right === 0 ? left / right : null
}
