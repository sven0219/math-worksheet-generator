import type { Problem } from './generator'

export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

export function questionText(problem: Problem): string {
  return problem.question ?? `${problem.text} =`
}

export function questionMarkup(problem: Problem): string {
  const text = questionText(problem)
  return escapeHtml(text).replaceAll('□', '<span class="question-blank" aria-label="填空"></span>')
    .replaceAll('○', '<span class="symbol-blank" aria-label="填写符号">○</span>')
}

export function verticalMarkup(problem: Problem): string {
  const vertical = problem.vertical
  if (!vertical) return questionMarkup(problem)
  const { top, bottom, operator } = vertical
  if (operator === '÷') {
    return `<span class="vertical-division" aria-label="${top} 除以 ${bottom}"><span class="division-quotient" aria-hidden="true"></span><span class="division-numbers"><span>${bottom}</span><span class="division-dividend">${top}</span></span><span class="vertical-working" aria-hidden="true"></span></span>`
  }
  return `<span class="vertical-equation" aria-label="${top} ${operator} ${bottom}"><span class="vertical-top">${top}</span><span class="vertical-bottom"><span>${operator}</span><span>${bottom}</span></span><span class="vertical-working" aria-hidden="true"></span></span>`
}

export function answerMarkup(problem: Problem): string {
  if (!problem.question) {
    return `${escapeHtml(problem.text)} <span class="shared-result">= <strong>${escapeHtml(problem.answer)}</strong></span>`
  }
  return `<span>${escapeHtml(problem.question)}</span> <span class="shared-result">填 <strong>${escapeHtml(problem.answer)}</strong></span>${problem.solution ? `<small class="shared-solution">${escapeHtml(problem.solution)}</small>` : ''}`
}

export function worksheetColumnCount(problems: Problem[], operands: number, limit: number): number {
  // Fifty vertical exercises need taller rows: five columns × ten rows.
  if (problems.every((problem) => problem.vertical)) return 5
  return operands === 2 && limit <= 100 && problems.every((problem) =>
    !problem.question && problem.text.length < 16) ? 3 : 2
}

export function worksheetSubtitle(settings: { limit: number; operands: number; operations: string[]; problemTypes: string[] }): string {
  const arithmeticOnly = settings.problemTypes.length === 1 && settings.problemTypes[0] === 'calculation'
  if (arithmeticOnly) return `${settings.limit} 以内 · ${settings.operations.join(' · ')} · 每题 ${settings.operands} 个数字`
  const labels: Record<string, string> = {
    calculation: '口算', missing: '填空', comparison: '比较', operator: '填符号', multiplication: '口诀',
    vertical: '竖式', remainder: '余数', time: '时间', money: '人民币', unit: '单位', fraction: '分数', decimal: '小数',
  }
  const joined = settings.problemTypes.map((type) => labels[type] ?? type).join(' · ')
  return joined.length > 44 ? `综合练习 · ${settings.problemTypes.length} 种题型` : `综合练习 · ${joined}`
}
