import type { AppSettings } from './advanced-generator'
import type { Worksheet } from './generator'
import { escapeHtml, questionMarkup, verticalMarkup, worksheetColumnCount, worksheetSubtitle } from './problem-view'
import type { PaperStyle } from './ui-constants'
import { operationNames } from './ui-constants'

export interface PrintContext {
  settings: AppSettings
  paperStyle: PaperStyle
  copies: number
  qrImages: string[]
  sheetUrlForCopy: (copyIndex: number) => string
}

export function pagePattern(style: PaperStyle): string {
  if (style === 'plain') return ''
  const xs = Array.from({ length: 24 }, (_, i) => 12 + i * 8)
  const ys = Array.from({ length: 35 }, (_, i) => 12 + i * 8)
  const vertical = xs.map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="297"/>`).join('')
  const horizontal = ys.map((y) => `<line x1="0" y1="${y}" x2="210" y2="${y}"/>`).join('')
  const dots = xs.map((x) => ys.map((y) => `<circle cx="${x}" cy="${y}" r=".38"/>`).join('')).join('')
  const tianzi = Array.from({ length: 13 }, (_, i) => 10 + i * 16).map((x) =>
    `<line x1="${x}" y1="0" x2="${x}" y2="297"/>`).join('') +
    Array.from({ length: 19 }, (_, i) => 9 + i * 16).map((y) =>
      `<line x1="0" y1="${y}" x2="210" y2="${y}"/>`).join('')
  const cross = Array.from({ length: 12 }, (_, i) => 18 + i * 16).map((x) =>
    `<line class="pattern-dash" x1="${x}" y1="0" x2="${x}" y2="297"/>`).join('') +
    Array.from({ length: 18 }, (_, i) => 17 + i * 16).map((y) =>
      `<line class="pattern-dash" x1="0" y1="${y}" x2="210" y2="${y}"/>`).join('')
  const contents = style === 'squares' ? vertical + horizontal
    : style === 'lines' ? horizontal
    : style === 'dots' ? dots : tianzi + cross
  return `<svg class="page-pattern pattern-${style}" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true" focusable="false">${contents}</svg>`
}

export function printPage(
  ctx: PrintContext,
  worksheet: Worksheet,
  page: number,
  copyIndex: number,
): string {
  const { settings, paperStyle, copies, qrImages, sheetUrlForCopy } = ctx
  const start = page * 50
  const problems = worksheet.problems.slice(start, start + 50)
  const columnCount = worksheetColumnCount(problems, settings.operands, settings.limit)
  const rows = Math.ceil(50 / columnCount)
  const columns = Array.from({ length: columnCount }, (_, column) =>
    problems.slice(column * rows, column * rows + rows))
  return `<section class="paper paper-${paperStyle} ${columnCount === 5 ? 'compact-paper' : ''}" aria-label="试卷第 ${page + 1} 页">${pagePattern(paperStyle)}
    <div class="paper-top">
      <div class="paper-heading"><div><span class="paper-kicker">${copies > 1 ? `第 ${copyIndex + 1} 份 · ` : ''}今天也要加油呀！</span><h2>数学计算练习卷</h2></div><div class="paper-heading-right"><span class="paper-qr-hint">扫码看答案</span><div class="paper-qr-stack"><a class="paper-qr" href="${sheetUrlForCopy(copyIndex)}" aria-label="扫码查看这份试卷的答案">${qrImages[copyIndex] ? `<img src="${qrImages[copyIndex]}" alt="扫码查看这份试卷的答案" width="90" height="90">` : '<span>二维码生成中</span>'}</a><span class="paper-page">${page + 1} / ${settings.count / 50}</span></div></div></div>
      <p class="paper-subtitle">${worksheetSubtitle({ ...settings, operations: settings.operations.map((operation) => operationNames[operation]) })}</p>
      <div class="student-fields"><span>姓名：<i></i></span><span>日期：<i></i></span><span>年级：<i></i></span><span>得分：<i></i></span><span>用时：<i></i> 分</span></div>
    </div>
    <div class="paper-columns" style="--question-columns:${columnCount};--question-rows:${rows}">${columns.map((column, columnIndex) => `<div class="problem-column">${column.map((problem, index) =>
      `<div class="problem ${problem.vertical ? 'vertical-problem' : ''}" data-problem-type="${problem.type ?? 'calculation'}"><span class="problem-number">${start + columnIndex * rows + index + 1}.</span><span class="problem-expression">${problem.vertical ? verticalMarkup(problem) : questionMarkup(problem)}</span>${!problem.question ? '<span class="answer-area" aria-hidden="true"></span>' : ''}</div>`
    ).join('')}</div>`).join('')}</div>
    <div class="paper-foot">认真检查每一道题，你真棒！<span>✦ 小小数学家</span></div>
  </section>`
}

export function answerPage(ctx: PrintContext, worksheet: Worksheet, copyIndex: number): string {
  const { settings, copies } = ctx
  const columns = Array.from({ length: settings.count / 25 }, (_, column) =>
    worksheet.problems.slice(column * 25, column * 25 + 25))
  return `<section class="paper answer-page" aria-label="参考答案（一张 A4）">
    <div class="paper-top"><div class="paper-heading"><div><span class="paper-kicker">家长核对专用 · 与题目分开</span><h2>参考答案${copies > 1 ? ` · 第 ${copyIndex + 1} 份` : ''}</h2></div><span class="paper-page">${settings.count} 题</span></div>
      <p class="paper-subtitle">按题号查找答案 · 多个空按顺序填写 · 分数可填等值形式 · 单独一张 A4</p></div>
    <div class="answer-columns" style="--answer-columns:${columns.length}">${columns.map((column, columnIndex) =>
      `<div class="answer-column">${column.map((problem, index) =>
        `<div class="answer-row"><span>${columnIndex * 25 + index + 1}.</span><strong>${escapeHtml(problem.answer)}</strong></div>`
      ).join('')}</div>`).join('')}</div>
    <div class="paper-foot">答案页与题目分开打印<span>✦ 小小数学家</span></div>
  </section>`
}
