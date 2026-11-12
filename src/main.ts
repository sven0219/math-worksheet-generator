import './style.css'
import QRCode from 'qrcode'
import { generateMixedWorksheet, problemTypeOptions, allMultiplicationTables, type AppSettings } from './advanced-generator'
import { decodeSheet, encodeSheet, seededRandom } from './worksheet-link'
import { questionMarkup, verticalMarkup, answerMarkup, escapeHtml, worksheetColumnCount, worksheetSubtitle } from './problem-view'
import {
  type AdditionRegrouping,
  type Operation,
  type OperandCount,
  type ProblemType,
  type Settings,
  type SubtractionRegrouping,
  type Worksheet,
} from './generator'

type PaperStyle = 'plain' | 'squares' | 'lines' | 'dots' | 'tianzi'
type PresetId = 'preschool' | 'grade1-first' | 'grade1-second' | 'grade2' | 'custom'
type SettingsTab = 'basics' | 'types' | 'life' | 'print'

interface SettingsPreset {
  id: Exclude<PresetId, 'custom'>
  label: string
  description: string
  settings: Pick<Settings, 'limit' | 'operations' | 'operands' | 'additionRegrouping' | 'subtractionRegrouping'>
}

const styleLabels: Record<PaperStyle, string> = {
  plain: '清爽白纸', squares: '数学方格', lines: '整齐横线',
  dots: '点点阵列', tianzi: '田字格纸',
}
const styleIcons: Record<PaperStyle, string> = {
  plain: '◻', squares: '▦', lines: '☷', dots: '⠿', tianzi: '田',
}
const operationNames: Record<Operation, string> = {
  '+': '加法', '−': '减法', '×': '乘法', '÷': '除法',
}
const operationSymbols: Operation[] = ['+', '−', '×', '÷']
const paperStyles: PaperStyle[] = ['plain', 'squares', 'lines', 'dots', 'tianzi']
const additionRegroupingOptions: Array<[AdditionRegrouping, string]> = [
  ['any', '随机'], ['without-carry', '不进位'], ['with-carry', '必须进位'],
]
const subtractionRegroupingOptions: Array<[SubtractionRegrouping, string]> = [
  ['any', '随机'], ['without-borrow', '不退位'], ['with-borrow', '必须退位'],
]
const settingsPresets: SettingsPreset[] = [
  {
    id: 'preschool', label: '幼小衔接', description: '10 以内加减',
    settings: {
      limit: 10, operations: ['+', '−'], operands: 2,
      additionRegrouping: 'any', subtractionRegrouping: 'any',
    },
  },
  {
    id: 'grade1-first', label: '一年级上', description: '20 以内加减',
    settings: {
      limit: 20, operations: ['+', '−'], operands: 2,
      additionRegrouping: 'any', subtractionRegrouping: 'any',
    },
  },
  {
    id: 'grade1-second', label: '一年级下', description: '100 以内加减',
    settings: {
      limit: 100, operations: ['+', '−'], operands: 2,
      additionRegrouping: 'any', subtractionRegrouping: 'any',
    },
  },
  {
    id: 'grade2', label: '二年级', description: '100 以内四则',
    settings: {
      limit: 100, operations: ['+', '−', '×', '÷'], operands: 2,
      additionRegrouping: 'any', subtractionRegrouping: 'any',
    },
  },
]
const problemTypeSymbols: Record<ProblemType, string> = {
  calculation: '＝', missing: '□', comparison: '＞', operator: '○', multiplication: '×',
  vertical: '↕', time: '◷', money: '¥', unit: '↔', fraction: '½', decimal: '.1', remainder: '…',
}
const specialtyTypes: ProblemType[] = ['calculation', 'missing', 'comparison', 'operator', 'multiplication', 'vertical', 'remainder']
const lifeTypes: ProblemType[] = ['time', 'money', 'unit', 'fraction', 'decimal']
const settingsTabs: Array<[SettingsTab, string, string]> = [
  ['basics', '基础计算', '范围与运算'],
  ['types', '题型专项', '填空、口诀、竖式'],
  ['life', '生活数学', '时间、单位、分数'],
  ['print', '打印设置', '题量、纸张、答案'],
]

interface SheetCopy { seed: number; worksheet: Worksheet }

function newSeed(): number {
  return typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 4294967296)
}

let settings: AppSettings = {
  count: 50,
  limit: 20,
  operations: ['+', '−'],
  operands: 2,
  additionRegrouping: 'any',
  subtractionRegrouping: 'any',
  problemTypes: ['calculation'],
  multiplicationTables: [...allMultiplicationTables],
}
const limitPresets = [5, 10, 20, 50, 100, 200]
let customLimit = 200
let useCustomLimit = false
let activePreset: PresetId = 'grade1-first'
let activeSettingsTab: SettingsTab = 'basics'
let paperStyle: PaperStyle = 'plain'
let includeAnswers = false
let copies = 1
let worksheets: SheetCopy[] = makeWorksheets()
let error = ''
const homeUrl = new URL('.', window.location.href).href
const siteBase = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'https://sven0219.github.io/math-worksheet-generator/'
  : homeUrl
const sharedSheet = decodeSheet(new URLSearchParams(window.location.search).get('sheet'))
let qrImages: string[] = []
let qrVersion = 0
if (new URLSearchParams(window.location.search).has('sheet') && !sharedSheet) {
  error = '这个答案链接无效或已损坏。请重新扫描试卷上的二维码。'
}

const app = document.querySelector<HTMLDivElement>('#app')!

function choice(name: string, value: string | number, label: string, selected: boolean): string {
  return `<label class="choice"><input type="radio" name="${name}" value="${value}" ${selected ? 'checked' : ''}><span>${label}</span></label>`
}

function presetChoice(id: PresetId, label: string, description: string): string {
  return `<label class="preset-choice"><input type="radio" name="preset" value="${id}" ${activePreset === id ? 'checked' : ''}><span><b>${label}</b><small>${description}</small></span></label>`
}

function problemTypeChoice(type: ProblemType): string {
  const label = problemTypeOptions.find(([candidate]) => candidate === type)?.[1] ?? type
  return `<label class="type-choice"><input type="checkbox" name="problemType" value="${type}" ${settings.problemTypes.includes(type) ? 'checked' : ''}><span><b aria-hidden="true">${problemTypeSymbols[type]}</b>${label}</span></label>`
}

function renderSettingsControls(): string {
  const tabs = settingsTabs.map(([id, label, description]) =>
    `<button type="button" role="tab" id="tab-${id}" class="settings-tab ${activeSettingsTab === id ? 'active' : ''}" data-tab="${id}" aria-controls="panel-${id}" aria-selected="${activeSettingsTab === id}" tabindex="${activeSettingsTab === id ? 0 : -1}"><b>${label}</b><small>${description}</small></button>`).join('')
  const basics = `<div class="settings-panel ${activeSettingsTab === 'basics' ? 'active' : ''}" data-panel="basics">
    <div class="control-card preset-card"><div class="card-title"><span class="title-icon blue">A1</span><div><h3>现在学到哪儿？</h3><p>一键选择适合的练习难度</p></div></div><fieldset><legend>年级与难度预设</legend><div class="preset-grid">${settingsPresets.map((preset) =>
      presetChoice(preset.id, preset.label, preset.description)).join('')}${presetChoice('custom', '自定义', '保留当前设置')}</div></fieldset><p class="preset-hint">预设只调整范围、运算和数字个数，选好后仍可继续修改。</p></div>
    <div class="control-card"><div class="card-title"><span class="title-icon lavender">A2</span><div><h3>数字到哪里？</h3><p>口算、填空、比较、竖式、小数的上限</p></div></div><fieldset><legend>数字范围</legend><div class="choice-row range-options">${limitPresets.map((n) => choice('limit', n, `${n} 以内`, !useCustomLimit && settings.limit === n)).join('')}${choice('limit', 'custom', '自定义', useCustomLimit)}</div><label class="custom-range">自定义上限（2～200）<input type="number" name="customLimit" min="2" max="200" step="1" value="${customLimit}" inputmode="numeric"></label></fieldset></div>
    <div class="control-card"><div class="card-title"><span class="title-icon mint">A3</span><div><h3>做什么运算？</h3><p>用于口算、填空和竖式</p></div></div><fieldset><legend>运算方式（可多选）</legend><div class="choice-row operations">${operationSymbols.map((operator) =>
      `<label class="choice op-choice"><input type="checkbox" name="operation" value="${operator}" ${settings.operations.includes(operator) ? 'checked' : ''}><span><b>${operator}</b>${operationNames[operator]}</span></label>`).join('')}</div></fieldset>
      ${settings.operations.includes('+') ? `<fieldset class="regrouping-field"><legend>加法进位</legend><div class="choice-row compact-choices">${additionRegroupingOptions.map(([mode, label]) =>
        choice('additionRegrouping', mode, label, settings.additionRegrouping === mode)).join('')}</div></fieldset>` : ''}
      ${settings.operations.includes('−') ? `<fieldset class="regrouping-field"><legend>减法退位</legend><div class="choice-row compact-choices">${subtractionRegroupingOptions.map(([mode, label]) =>
        choice('subtractionRegrouping', mode, label, settings.subtractionRegrouping === mode)).join('')}</div></fieldset>` : ''}
      ${settings.operations.includes('+') || settings.operations.includes('−') ? '<p class="regrouping-hint">多数字题中的每一步都会遵守所选规则。</p>' : ''}
      <fieldset><legend>每道口算题几个数字？</legend><div class="choice-row">${([2, 3, 4] as OperandCount[]).map((n) => choice('operands', n, `${n} 个`, settings.operands === n)).join('')}</div></fieldset></div>
  </div>`
  const types = `<div class="settings-panel ${activeSettingsTab === 'types' ? 'active' : ''}" data-panel="types">
    <div class="control-card"><div class="card-title"><span class="title-icon peach">B1</span><div><h3>题型专项</h3><p>多选后平均分配并打乱</p></div></div><fieldset><legend>选择一种或多种题型</legend><div class="type-grid">${specialtyTypes.map(problemTypeChoice).join('')}</div></fieldset><p class="preset-hint">填空位置随机；比较题包含数字与算式；填运算符使用加减乘除。</p></div>
    ${settings.problemTypes.includes('multiplication') ? `<div class="control-card"><div class="card-title"><span class="title-icon yellow">B2</span><div><h3>九九乘法专项</h3><p>乘法、除法和缺项正反练习</p></div></div><fieldset><legend>选择要练的口诀段</legend><div class="choice-row table-options">${allMultiplicationTables.map((table) =>
      `<label class="choice"><input type="checkbox" name="multiplicationTable" value="${table}" ${settings.multiplicationTables.includes(table) ? 'checked' : ''}><span>${table} 的口诀</span></label>`).join('')}</div></fieldset><p class="preset-hint">口诀固定为 2～9，乘积不超过 81，不使用基础计算的数字上限。</p></div>` : ''}
  </div>`
  const life = `<div class="settings-panel ${activeSettingsTab === 'life' ? 'active' : ''}" data-panel="life">
    <div class="control-card"><div class="card-title"><span class="title-icon mint">C1</span><div><h3>生活与拓展数学</h3><p>小学基础范围，适合综合复习</p></div></div><fieldset><legend>选择一种或多种题型</legend><div class="type-grid">${lifeTypes.map(problemTypeChoice).join('')}</div></fieldset></div>
    <div class="control-card topic-guide"><h3>本组范围</h3><ul><li>整点、半点、30/60/90 分钟时长与时分换算</li><li>20 元以内元角分换算，换算后最多 2000 分</li><li>1～9 个长度/质量大单位的双向换算，最多 9000 小单位</li><li>同分母分数：分母 2～9，结果在 0～1；一位小数使用基础计算上限</li></ul><p>时间、人民币、单位和分数采用上述专项范围，不使用整数上限；小数不套用进退位规则。</p></div>
  </div>`
  const print = `<div class="settings-panel ${activeSettingsTab === 'print' ? 'active' : ''}" data-panel="print">
    <div class="control-card"><div class="card-title"><span class="title-icon peach">D1</span><div><h3>今天练多少？</h3><p>每页始终排 50 题</p></div></div><fieldset><legend>每份题目数量</legend><div class="choice-row">${[50, 100].map((n) => choice('count', n, `${n} 题`, settings.count === n)).join('')}</div></fieldset><label class="custom-range">打印份数（每份题目不同）<input type="number" name="copies" min="1" max="10" step="1" value="${copies}" inputmode="numeric" ${settings.count === 100 ? 'disabled' : ''}></label>${settings.count === 100 ? '<p class="copies-hint">要打印多份不同试卷，请先选 50 题。</p>' : '<p class="copies-hint">每份 50 题，最多 10 份。</p>'}</div>
    <div class="control-card"><div class="card-title"><span class="title-icon yellow">D2</span><div><h3>挑一张喜欢的纸</h3><p>每一种都适合写写算算</p></div></div><fieldset><legend>卷面样式</legend><div class="style-grid">${paperStyles.map((style) =>
      `<label class="style-choice"><input type="radio" name="style" value="${style}" ${paperStyle === style ? 'checked' : ''}><span><b aria-hidden="true">${styleIcons[style]}</b>${styleLabels[style]}</span></label>`).join('')}</div></fieldset></div>
    <label class="answer-toggle"><input type="checkbox" name="answers" ${includeAnswers ? 'checked' : ''}><span><b>附上答案页</b><small>每份试卷各对应一张 A4 答案纸</small></span></label>
  </div>`
  const panels = `${basics}${types}${life}${print}`.replace(/data-panel="(basics|types|life|print)"/g, (_, id: SettingsTab) =>
    `data-panel="${id}" id="panel-${id}" role="tabpanel" aria-labelledby="tab-${id}" ${activeSettingsTab === id ? '' : 'hidden'}`)
  return `<nav class="settings-tabs" role="tablist" aria-label="设置分类">${tabs}</nav>${panels}`
}

function makeWorksheets(worksheetSettings: AppSettings = settings): SheetCopy[] {
  const result: SheetCopy[] = []
  const signatures = new Set<string>()
  for (let copy = 0; copy < copies; copy++) {
    let seed = newSeed()
    let worksheet = generateMixedWorksheet(worksheetSettings, seededRandom(seed))
    let signature = [...new Set(worksheet.problems.map((problem) => problem.text))].sort().join('|')
    for (let attempt = 0; attempt < 20 && signatures.has(signature); attempt++) {
      seed = newSeed()
      worksheet = generateMixedWorksheet(worksheetSettings, seededRandom(seed))
      signature = [...new Set(worksheet.problems.map((problem) => problem.text))].sort().join('|')
    }
    signatures.add(signature)
    result.push({ seed, worksheet })
  }
  return result
}

function hasDuplicateCopies(): boolean {
  const signatures = worksheets.map(({ worksheet }) =>
    [...new Set(worksheet.problems.map((problem) => problem.text))].sort().join('|'))
  return new Set(signatures).size < signatures.length
}

function sheetUrl(sheet: SheetCopy, copyIndex: number): string {
  const url = new URL(siteBase)
  url.searchParams.set('sheet', encodeSheet(settings, sheet.seed, copyIndex + 1))
  return url.href
}

function updateQrImages(): void {
  const version = ++qrVersion
  qrImages = []
  Promise.all(worksheets.map((sheet, index) => QRCode.toDataURL(sheetUrl(sheet, index), {
    width: 140, margin: 2, errorCorrectionLevel: 'M',
    color: { dark: '#292d5c', light: '#ffffff' },
  }))).then((images) => {
    if (version !== qrVersion) return
    qrImages = images
    render()
  }).catch(() => {
    if (version !== qrVersion) return
    error = '二维码生成失败，请刷新网页后重试。'
    render()
  })
}

function pagePattern(style: PaperStyle): string {
  if (style === 'plain') return ''
  // Real SVG strokes, not CSS backgrounds: they print without "background graphics".
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

function printPage(worksheet: Worksheet, page: number, copyIndex: number): string {
  const start = page * 50
  const problems = worksheet.problems.slice(start, start + 50)
  const columnCount = worksheetColumnCount(problems, settings.operands, settings.limit)
  const rows = Math.ceil(50 / columnCount)
  const columns = Array.from({ length: columnCount }, (_, column) =>
    problems.slice(column * rows, column * rows + rows))
  return `<section class="paper paper-${paperStyle} ${columnCount === 5 ? 'compact-paper' : ''}" aria-label="试卷第 ${page + 1} 页">${pagePattern(paperStyle)}
    <div class="paper-top">
      <div class="paper-heading"><div><span class="paper-kicker">${copies > 1 ? `第 ${copyIndex + 1} 份 · ` : ''}今天也要加油呀！</span><h2>数学计算练习卷</h2></div><div class="paper-heading-right"><span class="paper-qr-hint">扫码看答案</span><div class="paper-qr-stack"><a class="paper-qr" href="${sheetUrl(worksheets[copyIndex], copyIndex)}" aria-label="扫码查看这份试卷的答案">${qrImages[copyIndex] ? `<img src="${qrImages[copyIndex]}" alt="扫码查看这份试卷的答案" width="90" height="90">` : '<span>二维码生成中</span>'}</a><span class="paper-page">${page + 1} / ${settings.count / 50}</span></div></div></div>
      <p class="paper-subtitle">${worksheetSubtitle({ ...settings, operations: settings.operations.map((operation) => operationNames[operation]) })}</p>
      <div class="student-fields"><span>姓名：<i></i></span><span>日期：<i></i></span><span>年级：<i></i></span><span>得分：<i></i></span><span>用时：<i></i> 分</span></div>
    </div>
    <div class="paper-columns" style="--question-columns:${columnCount};--question-rows:${rows}">${columns.map((column, columnIndex) => `<div class="problem-column">${column.map((problem, index) =>
      `<div class="problem ${problem.vertical ? 'vertical-problem' : ''}" data-problem-type="${problem.type ?? 'calculation'}"><span class="problem-number">${start + columnIndex * rows + index + 1}.</span><span class="problem-expression">${problem.vertical ? verticalMarkup(problem) : questionMarkup(problem)}</span>${!problem.question ? '<span class="answer-area" aria-hidden="true"></span>' : ''}</div>`
    ).join('')}</div>`).join('')}</div>
    <div class="paper-foot">认真检查每一道题，你真棒！<span>✦ 小小数学家</span></div>
  </section>`
}

function answerPage(worksheet: Worksheet, copyIndex: number): string {
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

function renderSharedAnswers(): void {
  if (!sharedSheet) return
  const { sheet, settings: sharedSettings, copy } = sharedSheet
  app.innerHTML = `<main class="shared-answers"><div class="shared-header"><div class="brand"><div class="brand-mark" aria-hidden="true">✳</div><span>小小数学家 <small>Math Club</small></span></div><a href="${homeUrl}">← 返回出题</a></div>
    <div class="shared-intro"><span class="eyebrow">✦ 扫码核对答案</span><h1>这份练习卷的答案</h1><p>第 ${copy} 份 · ${sharedSettings.count} 道题。按试卷题号对照；多个空按顺序填写，分数的等值形式也正确。做错了也没关系，学会就好！</p><a class="shared-start" href="${homeUrl}">✦ 我要出题 <span aria-hidden="true">↗</span></a></div>
    <div class="shared-grid" style="--answer-screen-columns:${sharedSettings.operands === 2 && sheet.worksheet.problems.every((problem) => !problem.question) ? 3 : 2}">${sheet.worksheet.problems.map((problem, index) =>
      `<div class="shared-answer"><span class="shared-number">${index + 1}.</span><span class="shared-equation">${answerMarkup(problem)}</span></div>`
    ).join('')}</div><p class="shared-footer">每一题认真思考，都是一次进步 ✨</p></main>`
}

function render(): void {
  if (sharedSheet) {
    renderSharedAnswers()
    return
  }
  const focused = document.activeElement
  const focusSelector = focused instanceof HTMLInputElement && app.contains(focused)
    ? `input[name="${CSS.escape(focused.name)}"][value="${CSS.escape(focused.value)}"]`
    : focused instanceof HTMLButtonElement && focused.dataset.tab ? `#tab-${focused.dataset.tab}` : null
  const pages = settings.count / 50
  const repeated = worksheets.reduce((total, { worksheet }) => total + worksheet.repeated, 0)
  const duplicateCopies = hasDuplicateCopies()
  app.innerHTML = `<div class="screen-shell">
    <header class="hero"><div class="hero-inner"><div class="brand"><div class="brand-mark" aria-hidden="true">✳</div><span>小小数学家 <small>Math Club</small></span></div>
      <div class="hero-copy"><span class="eyebrow">✦ 每天练一点，进步看得见</span><h1>让数学练习，<br><em>变得有趣一点！</em></h1><p>选好题目，挑张喜欢的纸，打印一份专属练习卷。<br>今天也要为自己鼓掌呀！</p></div>
      <div class="hero-doodle" aria-hidden="true"><div class="doodle-sun">✳</div><div class="doodle-card"><span>8 + 5 = ?</span><b>我会算！</b></div><span class="doodle-star">✦</span><span class="doodle-plus">＋</span></div>
    </div></header>
    <main class="workspace"><div class="workspace-heading"><div><span class="section-eyebrow">LET'S GET STARTED</span><h2>制作你的练习卷 <span aria-hidden="true">✏️</span></h2></div><p>简单几步，就能开始今天的数学冒险！</p></div>
      <div class="workspace-grid"><aside class="controls" aria-label="出题设置">
        ${renderSettingsControls()}
        <div class="selection-summary"><b>已选 ${settings.problemTypes.length} 种题型 · ${settings.count} 题</b><div class="selected-types">${settings.problemTypes.map((type) => `<button type="button" data-remove-type="${type}" aria-label="取消${problemTypeOptions.find(([candidate]) => type === candidate)?.[1]}">${problemTypeOptions.find(([candidate]) => type === candidate)?.[1]} <span aria-hidden="true">×</span></button>`).join('')}</div><p>跨标签保留选择，尽量均匀混合组卷。</p></div>
        ${error ? `<p class="status error" role="alert">${escapeHtml(error)}</p>` : ''}
        <button class="generate-button" type="button" data-action="generate">✦ &nbsp;生成新试卷</button>
      </aside>
       <section class="preview-section" aria-label="试卷预览"><div class="preview-toolbar"><div><span class="preview-label">✦ 实时预览</span><h3>你的专属练习卷</h3><p>${settings.count} 道题 × ${copies} 份 · ${pages * copies} 张题目 A4 · ${styleLabels[paperStyle]}</p></div><button class="print-button" type="button" data-action="print" ${duplicateCopies || qrImages.length !== worksheets.length ? 'disabled' : ''}>打印试卷 <span aria-hidden="true">↗</span></button></div>
        ${repeated ? `<p class="status notice" role="status">当前设置可生成的不同题目不足，试卷中共有 ${repeated} 道重复题。试试增加数字范围、运算方式、数字个数，或放宽进退位规则吧。</p>` : ''}
        ${duplicateCopies ? '<p class="status error" role="alert">当前设置可用的不同题目太少，无法保证每份试卷不同。请扩大范围、增加运算方式、放宽进退位规则，或减少份数。</p>' : ''}
        ${settings.problemTypes.includes('vertical') ? `<p class="status notice">${settings.problemTypes.length === 1 ? '纯竖式按五列十行' : '混合卷按两列并压缩其中竖式'}排版，每页仍为 50 题；书写空间有限，复杂演算可另用草稿纸。</p>` : ''}
        <div class="preview-note">💡 &nbsp;打印时选择 A4 纸、100% 缩放，并关闭浏览器页眉和页脚；扫描每张试卷右上角的二维码，可在网页查看该份试卷的答案。</div>
        <div class="paper-scroll">${worksheets.map(({ worksheet }, copyIndex) => Array.from({ length: pages }, (_, page) => printPage(worksheet, page, copyIndex)).join('')).join('')}${includeAnswers ? worksheets.map(({ worksheet }, copyIndex) => answerPage(worksheet, copyIndex)).join('') : ''}</div>
      </section></div>
    </main><footer class="site-footer">用一点点练习，收集好多好多进步。 <span>✳ 小小数学家</span></footer>
  </div>`
  if (focusSelector) app.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true })
}

app.addEventListener('change', (event) => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  if (input.name === 'style') {
    paperStyle = input.value as PaperStyle
  } else if (input.name === 'answers') {
    includeAnswers = input.checked
  } else {
    const previousCopies = copies
    const previousCustomLimit = customLimit
    const previousUseCustomLimit = useCustomLimit
    const previousPreset = activePreset
    const updated = { ...settings }
    if (input.name === 'preset') {
      const selectedPreset = input.value as PresetId
      if (selectedPreset === 'custom') {
        activePreset = 'custom'
        error = ''
        render()
        return
      }
      const preset = settingsPresets.find(({ id }) => id === selectedPreset)
      if (!preset) return
      Object.assign(updated, preset.settings)
      activePreset = preset.id
      useCustomLimit = false
    }
    if (input.name === 'count') {
      updated.count = Number(input.value) as Settings['count']
      if (updated.count === 100) copies = 1
    }
    if (input.name === 'copies') {
      const requested = Number(input.value)
      if (settings.count !== 50 || !Number.isInteger(requested) || requested < 1 || requested > 10) {
        error = '打印份数必须是 1～10 的整数，且每份选 50 题。'
        render()
        return
      }
      copies = requested
    }
    if (input.name === 'limit') {
      useCustomLimit = input.value === 'custom'
      updated.limit = useCustomLimit ? customLimit : Number(input.value)
    }
    if (input.name === 'customLimit') {
      const requested = Number(input.value)
      if (!Number.isInteger(requested) || requested < 2 || requested > 200) {
        error = '请输入 2～200 之间的整数。'
        render()
        return
      }
      customLimit = requested
      useCustomLimit = true
      updated.limit = requested
    }
    if (input.name === 'operands') updated.operands = Number(input.value) as OperandCount
    if (input.name === 'additionRegrouping') {
      updated.additionRegrouping = input.value as AdditionRegrouping
    }
    if (input.name === 'subtractionRegrouping') {
      updated.subtractionRegrouping = input.value as SubtractionRegrouping
    }
    if (input.name === 'problemType') {
      updated.problemTypes = problemTypeOptions.map(([type]) => type).filter((type) =>
        app.querySelector<HTMLInputElement>(`input[name="problemType"][value="${type}"]`)?.checked)
      if (!updated.problemTypes.length) {
        error = '请至少保留一种题型。'
        render()
        return
      }
    }
    if (input.name === 'multiplicationTable') {
      updated.multiplicationTables = allMultiplicationTables.filter((table) =>
        app.querySelector<HTMLInputElement>(`input[name="multiplicationTable"][value="${table}"]`)?.checked)
      if (!updated.multiplicationTables.length) {
        error = '请至少保留一段乘法口诀。'
        render()
        return
      }
    }
    if (input.name === 'operation') {
      updated.operations = operationSymbols.filter((symbol) =>
        [...app.querySelectorAll<HTMLInputElement>('input[name="operation"]')]
          .some((checkbox) => checkbox.value === symbol && checkbox.checked))
      if (!updated.operations.length) {
        input.checked = true
        error = '请至少保留一种运算方式哦！'
        render()
        return
      }
    }
    try {
      const generated = makeWorksheets(updated)
      settings = updated
      worksheets = generated
      if (input.name !== 'preset' && ['limit', 'customLimit', 'operands', 'operation', 'additionRegrouping', 'subtractionRegrouping'].includes(input.name)) {
        activePreset = 'custom'
      }
    } catch (cause) {
      copies = previousCopies
      customLimit = previousCustomLimit
      useCustomLimit = previousUseCustomLimit
      activePreset = previousPreset
      error = cause instanceof Error ? cause.message : '当前设置无法生成题目，请调整后重试。'
      render()
      return
    }
    updateQrImages()
  }
  error = ''
  render()
})

app.addEventListener('click', (event) => {
  const element = event.target as Element
  const tab = element.closest<HTMLButtonElement>('[data-tab]')
  if (tab && settingsTabs.some(([id]) => id === tab.dataset.tab)) {
    activeSettingsTab = tab.dataset.tab as SettingsTab
    render()
    app.querySelector<HTMLButtonElement>(`[data-tab="${activeSettingsTab}"]`)?.focus({ preventScroll: true })
    return
  }
  const remove = element.closest<HTMLButtonElement>('[data-remove-type]')
  if (remove) {
    const input = app.querySelector<HTMLInputElement>(`input[name="problemType"][value="${remove.dataset.removeType}"]`)
    if (input) {
      input.checked = false
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
    return
  }
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-action]')
  if (!button) return
  if (button.dataset.action === 'print' && !hasDuplicateCopies() && qrImages.length === worksheets.length) window.print()
  if (button.dataset.action === 'generate') {
    try {
      worksheets = makeWorksheets()
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '当前设置无法生成题目，请调整后重试。'
      render()
      return
    }
    error = ''
    updateQrImages()
    render()
    document.querySelector('.preview-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

app.addEventListener('keydown', (event) => {
  if (!(event.target instanceof HTMLButtonElement) || !event.target.dataset.tab) return
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const index = settingsTabs.findIndex(([id]) => id === activeSettingsTab)
  const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? settingsTabs.length - 1
    : (index + (event.key === 'ArrowRight' ? 1 : -1) + settingsTabs.length) % settingsTabs.length
  app.querySelector<HTMLButtonElement>(`[data-tab="${settingsTabs[nextIndex][0]}"]`)?.click()
})

render()
if (!sharedSheet) updateQrImages()
