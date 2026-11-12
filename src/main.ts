import './style.css'
import { problemTypeOptions, allMultiplicationTables, type AppSettings } from './advanced-generator'
import { decodeSheet } from './worksheet-link'
import { escapeHtml } from './problem-view'
import {
  type AdditionRegrouping,
  type OperandCount,
  type Settings,
  type SubtractionRegrouping,
} from './generator'
import {
  type PaperStyle,
  type PresetId,
  type SettingsTab,
  operationSymbols,
  settingsPresets,
  settingsTabs,
  styleLabels,
} from './ui-constants'
import { makeWorksheets, hasDuplicateCopies, type SheetCopy } from './worksheet-batch'
import { loadQrImages, resolveSiteBase, sheetUrl } from './qr-images'
import { answerPage, printPage, type PrintContext } from './print-templates'
import { problemTypePicker, renderSettingsControls } from './settings-templates'
import { renderSharedAnswersHtml } from './shared-answers-view'

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
let customLimit = 200
let useCustomLimit = false
let activePreset: PresetId = 'grade1-first'
let activeSettingsTab: SettingsTab = 'basics'
let paperStyle: PaperStyle = 'plain'
let includeAnswers = false
let copies = 1
let worksheets: SheetCopy[] = makeWorksheets(settings, copies)
let error = ''
const homeUrl = new URL('.', window.location.href).href
const siteBase = resolveSiteBase(homeUrl)
const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname)
const sharedSheet = decodeSheet(new URLSearchParams(window.location.search).get('sheet'))
let qrImages: string[] = []
let qrVersion = 0
if (new URLSearchParams(window.location.search).has('sheet') && !sharedSheet) {
  error = '这个答案链接无效或已损坏。请重新扫描试卷上的二维码。'
}

const app = document.querySelector<HTMLDivElement>('#app')!

function settingsViewState() {
  return {
    settings,
    customLimit,
    useCustomLimit,
    activePreset,
    activeSettingsTab,
    paperStyle,
    includeAnswers,
    copies,
  }
}

function printContext(): PrintContext {
  return {
    settings,
    paperStyle,
    copies,
    qrImages,
    sheetUrlForCopy: (copyIndex) => sheetUrl(siteBase, settings, worksheets[copyIndex], copyIndex),
  }
}

function updateQrImages(): void {
  const version = ++qrVersion
  qrImages = []
  loadQrImages(siteBase, settings, worksheets).then((images) => {
    if (version !== qrVersion) return
    qrImages = images
    render()
  }).catch(() => {
    if (version !== qrVersion) return
    error = '二维码生成失败，请刷新网页后重试。'
    render()
  })
}

function render(): void {
  if (sharedSheet) {
    app.innerHTML = renderSharedAnswersHtml(
      { worksheet: sharedSheet.sheet.worksheet, settings: sharedSheet.settings, copy: sharedSheet.copy },
      homeUrl,
    )
    return
  }
  const scrollTop = app.querySelector<HTMLElement>('.paper-scroll')?.scrollTop ?? 0
  const focused = document.activeElement
  const focusSelector = focused instanceof HTMLInputElement && app.contains(focused)
    ? `input[name="${CSS.escape(focused.name)}"][value="${CSS.escape(focused.value)}"]`
    : focused instanceof HTMLButtonElement && focused.dataset.tab ? `#tab-${focused.dataset.tab}` : null
  const pages = settings.count / 50
  const repeated = worksheets.reduce((total, { worksheet }) => total + worksheet.repeated, 0)
  const duplicateCopies = hasDuplicateCopies(worksheets)
  const qrPending = qrImages.length !== worksheets.length
  const printDisabled = duplicateCopies || qrPending
  const printLabel = qrPending ? '二维码准备中…' : '打印试卷'
  const ctx = printContext()
  app.innerHTML = `<div class="screen-shell">
    <header class="hero"><div class="hero-inner"><div class="brand"><div class="brand-mark" aria-hidden="true">✳</div><span>小小数学家 <small>Math Club</small></span></div>
      <div class="hero-copy"><span class="eyebrow">✦ 每天练一点，进步看得见</span><h1>让数学练习，<br><em>变得有趣一点！</em></h1><p>选好题目，挑张喜欢的纸，打印一份专属练习卷。<br>今天也要为自己鼓掌呀！</p></div>
      <div class="hero-doodle" aria-hidden="true"><div class="doodle-sun">✳</div><div class="doodle-card"><span>8 + 5 = ?</span><b>我会算！</b></div><span class="doodle-star">✦</span><span class="doodle-plus">＋</span></div>
    </div></header>
    <main class="workspace"><div class="workspace-heading"><div><span class="section-eyebrow">LET'S GET STARTED</span><h2>制作你的练习卷 <span aria-hidden="true">✏️</span></h2></div><p>简单几步，就能开始今天的数学冒险！</p></div>
      <div class="workspace-grid"><aside class="controls" aria-label="出题设置">
        ${problemTypePicker(settings)}
        ${renderSettingsControls(settingsViewState())}
        ${error ? `<p class="status error" role="alert">${escapeHtml(error)}</p>` : ''}
        <button class="generate-button" type="button" data-action="generate">✦ &nbsp;生成新试卷</button>
      </aside>
       <section class="preview-section" aria-label="试卷预览"><div class="preview-toolbar"><div><span class="preview-label">✦ 实时预览</span><h3>你的专属练习卷</h3><p>${settings.count} 道题 × ${copies} 份 · ${pages * copies} 张题目 A4 · ${styleLabels[paperStyle]}</p></div><button class="print-button" type="button" data-action="print" aria-busy="${qrPending}" aria-live="polite" ${printDisabled ? 'disabled' : ''}>${printLabel}${qrPending ? '' : ' <span aria-hidden="true">↗</span>'}</button></div>
        ${repeated ? `<p class="status notice" role="status">当前设置可生成的不同题目不足，试卷中共有 ${repeated} 道重复题。试试增加数字范围、运算方式、数字个数，或放宽进退位规则吧。</p>` : ''}
        ${duplicateCopies ? '<p class="status error" role="alert">当前设置可用的不同题目太少，无法保证每份试卷不同。请扩大范围、增加运算方式、放宽进退位规则，或减少份数。</p>' : ''}
        ${settings.problemTypes.includes('vertical') ? `<p class="status notice">${settings.problemTypes.length === 1 ? '纯竖式按五列十行' : '混合卷按两列并压缩其中竖式'}排版，每页仍为 50 题；书写空间有限，复杂演算可另用草稿纸。</p>` : ''}
        ${isLocalDev ? '<p class="status notice" role="status">本地预览时二维码指向 GitHub Pages，用手机扫码请部署站点或打开线上地址。</p>' : ''}
        <div class="preview-note">💡 &nbsp;打印时选择 A4 纸、100% 缩放，并关闭浏览器页眉和页脚；扫描每张试卷右上角的二维码，可在网页查看该份试卷的答案。</div>
        <div class="paper-scroll">${worksheets.map(({ worksheet }, copyIndex) => Array.from({ length: pages }, (_, page) => printPage(ctx, worksheet, page, copyIndex)).join('')).join('')}${includeAnswers ? worksheets.map(({ worksheet }, copyIndex) => answerPage(ctx, worksheet, copyIndex)).join('') : ''}</div>
      </section></div>
    </main><footer class="site-footer">用一点点练习，收集好多好多进步。 <span>✳ 小小数学家</span></footer>
  </div>`
  const paperScroll = app.querySelector<HTMLElement>('.paper-scroll')
  if (paperScroll) paperScroll.scrollTop = scrollTop
  if (focusSelector) app.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true })
}

app.addEventListener('change', (event) => {
  const target = event.target
  if (target instanceof HTMLSelectElement && target.name === 'rangeShortcut') {
    if (target.value === 'custom') {
      activeSettingsTab = 'basics'
      render()
      app.querySelector<HTMLInputElement>('input[name="customLimit"]')?.focus({ preventScroll: true })
      return
    }
    app.querySelector<HTMLInputElement>(`input[name="limit"][value="${target.value}"]`)?.click()
    return
  }
  if (!(target instanceof HTMLInputElement)) return
  const input = target
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
      const generated = makeWorksheets(updated, copies)
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
  const typeToggle = element.closest<HTMLButtonElement>('[data-toggle-type]')
  if (typeToggle) {
    const input = app.querySelector<HTMLInputElement>(`input[name="problemType"][value="${typeToggle.dataset.toggleType}"]`)
    if (input) {
      input.checked = !input.checked
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
    return
  }
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-action]')
  if (!button) return
  if (button.dataset.action === 'print' && !hasDuplicateCopies(worksheets) && qrImages.length === worksheets.length) window.print()
  if (button.dataset.action === 'generate') {
    try {
      worksheets = makeWorksheets(settings, copies)
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
