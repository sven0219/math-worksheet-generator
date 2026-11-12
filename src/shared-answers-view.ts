import type { AppSettings } from './advanced-generator'
import { answerMarkup } from './problem-view'
import type { Worksheet } from './generator'

export interface SharedSheetView {
  worksheet: Worksheet
  settings: AppSettings
  copy: number
}

export function renderSharedAnswersHtml(shared: SharedSheetView, homeUrl: string): string {
  const { worksheet: sheet, settings: sharedSettings, copy } = shared
  return `<main class="shared-answers"><div class="shared-header"><div class="brand"><div class="brand-mark" aria-hidden="true">✳</div><span>小小数学家 <small>Math Club</small></span></div><a href="${homeUrl}">← 返回出题</a></div>
    <div class="shared-intro"><span class="eyebrow">✦ 扫码核对答案</span><h1>这份练习卷的答案</h1><p>第 ${copy} 份 · ${sharedSettings.count} 道题。按试卷题号对照；多个空按顺序填写，分数的等值形式也正确。做错了也没关系，学会就好！</p><a class="shared-start" href="${homeUrl}">✦ 我要出题 <span aria-hidden="true">↗</span></a></div>
    <div class="shared-grid" style="--answer-screen-columns:${sharedSettings.operands === 2 && sheet.problems.every((problem) => !problem.question) ? 3 : 2}">${sheet.problems.map((problem, index) =>
      `<div class="shared-answer"><span class="shared-number">${index + 1}.</span><span class="shared-equation">${answerMarkup(problem)}</span></div>`
    ).join('')}</div><p class="shared-footer">每一题认真思考，都是一次进步 ✨</p></main>`
}
