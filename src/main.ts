import './style.css'
import QRCode from 'qrcode'
import { generateWorksheet, type Operation, type OperandCount, type Settings, type Worksheet } from './generator'

type PaperStyle = 'plain' | 'squares' | 'lines' | 'dots' | 'tianzi'

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

interface SheetCopy { seed: number; worksheet: Worksheet }

function seededRandom(seed: number): () => number {
  // Worksheet QR links use v1 + this PRNG; retain a v1 decoder if the generator changes.
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function newSeed(): number {
  return typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 4294967296)
}

function decodeSheet(value: string | null): { sheet: SheetCopy; settings: Settings; copy: number } | null {
  if (!value) return null
  const match = /^1\.(50|100)\.(\d{1,4})\.([234])\.([1-9]|1[0-5])\.([0-9a-z]+)\.([1-9]|10)$/.exec(value)
  if (!match) return null
  const [, countText, limitText, operandsText, maskText, seedText, copyText] = match
  const seed = Number.parseInt(seedText, 36)
  const limit = Number(limitText)
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || limit < 2 || limit > 1000) return null
  const mask = Number(maskText)
  const decodedSettings: Settings = {
    count: Number(countText) as Settings['count'],
    limit,
    operands: Number(operandsText) as OperandCount,
    operations: operationSymbols.filter((_, index) => mask & (1 << index)),
  }
  return {
    sheet: { seed, worksheet: generateWorksheet(decodedSettings, seededRandom(seed)) },
    settings: decodedSettings,
    copy: Number(copyText),
  }
}

let settings: Settings = { count: 50, limit: 20, operations: ['+', '−'], operands: 2 }
const limitPresets = [5, 10, 20, 50, 100, 200, 500, 1000]
let customLimit = 200
let useCustomLimit = false
let paperStyle: PaperStyle = 'plain'
let includeAnswers = false
let copies = 1
let worksheets: SheetCopy[] = makeWorksheets()
let error = ''
const siteBase = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'https://sven0219.github.io/math-worksheet-generator/'
  : new URL('.', window.location.href).href
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

function makeWorksheets(): SheetCopy[] {
  const result: SheetCopy[] = []
  const signatures = new Set<string>()
  for (let copy = 0; copy < copies; copy++) {
    let seed = newSeed()
    let worksheet = generateWorksheet(settings, seededRandom(seed))
    let signature = [...new Set(worksheet.problems.map((problem) => problem.text))].sort().join('|')
    for (let attempt = 0; attempt < 20 && signatures.has(signature); attempt++) {
      seed = newSeed()
      worksheet = generateWorksheet(settings, seededRandom(seed))
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
  const mask = operationSymbols.reduce((value, operation, index) =>
    value | (settings.operations.includes(operation) ? 1 << index : 0), 0)
  const url = new URL(siteBase)
  url.searchParams.set('sheet', `1.${settings.count}.${settings.limit}.${settings.operands}.${mask}.${sheet.seed.toString(36)}.${copyIndex + 1}`)
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
  const columnCount = settings.operands === 2 && settings.limit <= 100 ? 3 : 2
  const rows = Math.ceil(50 / columnCount)
  const columns = Array.from({ length: columnCount }, (_, column) =>
    problems.slice(column * rows, column * rows + rows))
  const operationLabel = settings.operations.map((operation) => operationNames[operation]).join(' · ')

  return `<section class="paper paper-${paperStyle}" aria-label="试卷第 ${page + 1} 页">${pagePattern(paperStyle)}
    <div class="paper-top">
      <div class="paper-heading"><div><span class="paper-kicker">${copies > 1 ? `第 ${copyIndex + 1} 份 · ` : ''}今天也要加油呀！</span><h2>数学计算练习卷</h2></div><div class="paper-heading-right"><a class="paper-qr" href="${sheetUrl(worksheets[copyIndex], copyIndex)}" aria-label="扫码查看这份试卷的答案">${qrImages[copyIndex] ? `<img src="${qrImages[copyIndex]}" alt="扫码查看这份试卷的答案" width="90" height="90">` : '<span>二维码生成中</span>'}</a><span class="paper-page">${page + 1} / ${settings.count / 50}</span></div></div>
      <p class="paper-subtitle">${settings.limit} 以内 · ${operationLabel} · 每题 ${settings.operands} 个数字</p>
      <div class="student-fields"><span>姓名：<i></i></span><span>日期：<i></i></span><span>年级：<i></i></span><span>得分：<i></i></span><span>用时：<i></i> 分</span></div>
    </div>
    <div class="paper-columns" style="--question-columns:${columnCount};--question-rows:${rows}">${columns.map((column, columnIndex) => `<div class="problem-column">${column.map((problem, index) =>
      `<div class="problem"><span class="problem-number">${start + columnIndex * rows + index + 1}.</span><span class="problem-expression">${problem.text} =</span><span class="answer-area" aria-hidden="true"></span></div>`
    ).join('')}</div>`).join('')}</div>
    <div class="paper-foot">认真检查每一道题，你真棒！<span>✦ 小小数学家</span></div>
  </section>`
}

function answerPage(worksheet: Worksheet, copyIndex: number): string {
  const columns = Array.from({ length: settings.count / 25 }, (_, column) =>
    worksheet.problems.slice(column * 25, column * 25 + 25))
  return `<section class="paper answer-page" aria-label="参考答案（一张 A4）">
    <div class="paper-top"><div class="paper-heading"><div><span class="paper-kicker">家长核对专用 · 与题目分开</span><h2>参考答案${copies > 1 ? ` · 第 ${copyIndex + 1} 份` : ''}</h2></div><span class="paper-page">${settings.count} 题</span></div>
      <p class="paper-subtitle">${settings.limit} 以内 · 按题号查找答案 · 单独一张 A4</p></div>
    <div class="answer-columns" style="--answer-columns:${columns.length}">${columns.map((column, columnIndex) =>
      `<div class="answer-column">${column.map((problem, index) =>
        `<div class="answer-row"><span>${columnIndex * 25 + index + 1}.</span><strong>${problem.answer}</strong></div>`
      ).join('')}</div>`).join('')}</div>
    <div class="paper-foot">答案页与题目分开打印<span>✦ 小小数学家</span></div>
  </section>`
}

function renderSharedAnswers(): void {
  if (!sharedSheet) return
  const { sheet, settings: sharedSettings, copy } = sharedSheet
  app.innerHTML = `<main class="shared-answers"><div class="shared-header"><div class="brand"><div class="brand-mark" aria-hidden="true">✳</div><span>小小数学家 <small>Math Club</small></span></div><a href="${siteBase}">← 返回出题</a></div>
    <div class="shared-intro"><span class="eyebrow">✦ 扫码核对答案</span><h1>这份练习卷的答案</h1><p>第 ${copy} 份 · ${sharedSettings.count} 道题 · ${sharedSettings.limit} 以内。按试卷题号对照，做错了也没关系，学会就好！</p></div>
    <div class="shared-grid">${sheet.worksheet.problems.map((problem, index) =>
      `<div class="shared-answer"><span class="shared-number">${index + 1}.</span><span>${problem.text} =</span><strong>${problem.answer}</strong></div>`
    ).join('')}</div><p class="shared-footer">每一题认真思考，都是一次进步 ✨</p></main>`
}

function render(): void {
  if (sharedSheet) {
    renderSharedAnswers()
    return
  }
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
        <div class="control-card"><div class="card-title"><span class="title-icon peach">01</span><div><h3>今天练多少？</h3><p>选一个刚刚好的题量</p></div></div><fieldset><legend>每份题目数量</legend><div class="choice-row">${[50, 100].map((n) => choice('count', n, `${n} 题`, settings.count === n)).join('')}</div></fieldset><label class="custom-range">打印份数（每份题目不同）<input type="number" name="copies" min="1" max="10" step="1" value="${copies}" inputmode="numeric" ${settings.count === 100 ? 'disabled' : ''}></label>${settings.count === 100 ? '<p class="copies-hint">要打印多份不同试卷，请先选 50 题。</p>' : '<p class="copies-hint">每份 50 题，最多 10 份。</p>'}</div>
        <div class="control-card"><div class="card-title"><span class="title-icon lavender">02</span><div><h3>数字到哪里？</h3><p>从简单开始，慢慢升级</p></div></div><fieldset><legend>数字范围</legend><div class="choice-row range-options">${limitPresets.map((n) => choice('limit', n, `${n} 以内`, !useCustomLimit && settings.limit === n)).join('')}${choice('limit', 'custom', '自定义', useCustomLimit)}</div><label class="custom-range">自定义上限（2～1000）<input type="number" name="customLimit" min="2" max="1000" step="1" value="${customLimit}" inputmode="numeric"></label></fieldset></div>
        <div class="control-card"><div class="card-title"><span class="title-icon mint">03</span><div><h3>做什么运算？</h3><p>可以同时选好几种哦</p></div></div><fieldset><legend>运算方式（可多选）</legend><div class="choice-row operations">${operationSymbols.map((operator) =>
          `<label class="choice op-choice"><input type="checkbox" name="operation" value="${operator}" ${settings.operations.includes(operator) ? 'checked' : ''}><span><b>${operator}</b>${operationNames[operator]}</span></label>`).join('')}</div></fieldset>
          <fieldset><legend>每道题几个数字？</legend><div class="choice-row">${([2, 3, 4] as OperandCount[]).map((n) => choice('operands', n, `${n} 个`, settings.operands === n)).join('')}</div></fieldset></div>
        <div class="control-card"><div class="card-title"><span class="title-icon yellow">04</span><div><h3>挑一张喜欢的纸</h3><p>每一种都适合写写算算</p></div></div><fieldset><legend>卷面样式</legend><div class="style-grid">${paperStyles.map((style) =>
          `<label class="style-choice"><input type="radio" name="style" value="${style}" ${paperStyle === style ? 'checked' : ''}><span><b aria-hidden="true">${styleIcons[style]}</b>${styleLabels[style]}</span></label>`).join('')}</div></fieldset></div>
        <label class="answer-toggle"><input type="checkbox" name="answers" ${includeAnswers ? 'checked' : ''}><span><b>附上答案页</b><small>每份试卷各对应一张 A4 答案纸</small></span></label>
        ${error ? `<p class="status error" role="alert">${error}</p>` : ''}
        <button class="generate-button" type="button" data-action="generate">✦ &nbsp;生成新试卷</button>
      </aside>
       <section class="preview-section" aria-label="试卷预览"><div class="preview-toolbar"><div><span class="preview-label">✦ 实时预览</span><h3>你的专属练习卷</h3><p>${settings.count} 道题 × ${copies} 份 · ${pages * copies} 张题目 A4 · ${styleLabels[paperStyle]}</p></div><button class="print-button" type="button" data-action="print" ${duplicateCopies || qrImages.length !== worksheets.length ? 'disabled' : ''}>打印试卷 <span aria-hidden="true">↗</span></button></div>
        ${repeated ? `<p class="status notice" role="status">当前设置可生成的不同题目不足，试卷中共有 ${repeated} 道重复题。试试增加数字范围、运算方式或数字个数吧。</p>` : ''}
        ${duplicateCopies ? '<p class="status error" role="alert">当前设置可用的不同题目太少，无法保证每份试卷不同。请扩大范围、增加运算方式，或减少份数。</p>' : ''}
        <div class="preview-note">💡 &nbsp;打印时选择 A4 纸、100% 缩放，并关闭浏览器页眉和页脚；扫描每张试卷右上角的二维码，可在网页查看该份试卷的答案。</div>
        <div class="paper-scroll">${worksheets.map(({ worksheet }, copyIndex) => Array.from({ length: pages }, (_, page) => printPage(worksheet, page, copyIndex)).join('')).join('')}${includeAnswers ? worksheets.map(({ worksheet }, copyIndex) => answerPage(worksheet, copyIndex)).join('') : ''}</div>
      </section></div>
    </main><footer class="site-footer">用一点点练习，收集好多好多进步。 <span>✳ 小小数学家</span></footer>
  </div>`
}

app.addEventListener('change', (event) => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  if (input.name === 'style') {
    paperStyle = input.value as PaperStyle
  } else if (input.name === 'answers') {
    includeAnswers = input.checked
  } else {
    const updated = { ...settings }
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
      if (!Number.isInteger(requested) || requested < 2 || requested > 1000) {
        error = '请输入 2～1000 之间的整数。'
        render()
        return
      }
      customLimit = requested
      useCustomLimit = true
      updated.limit = requested
    }
    if (input.name === 'operands') updated.operands = Number(input.value) as OperandCount
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
    settings = updated
    worksheets = makeWorksheets()
    updateQrImages()
  }
  error = ''
  render()
})

app.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-action]')
  if (!button) return
  if (button.dataset.action === 'print' && !hasDuplicateCopies() && qrImages.length === worksheets.length) window.print()
  if (button.dataset.action === 'generate') {
    worksheets = makeWorksheets()
    updateQrImages()
    render()
    document.querySelector('.preview-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

render()
if (!sharedSheet) updateQrImages()
