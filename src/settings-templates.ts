import { problemTypeOptions, allMultiplicationTables, type AppSettings } from './advanced-generator'
import type { OperandCount, ProblemType } from './generator'
import {
  type PaperStyle,
  type PresetId,
  type SettingsTab,
  additionRegroupingOptions,
  lifeTypes,
  limitPresets,
  operationNames,
  operationSymbols,
  paperStyles,
  problemTypeSymbols,
  settingsPresets,
  settingsTabs,
  specialtyTypes,
  styleIcons,
  styleLabels,
  subtractionRegroupingOptions,
} from './ui-constants'

export interface SettingsViewState {
  settings: AppSettings
  customLimit: number
  useCustomLimit: boolean
  activePreset: PresetId
  activeSettingsTab: SettingsTab
  paperStyle: PaperStyle
  includeAnswers: boolean
  copies: number
}

function choice(name: string, value: string | number, label: string, selected: boolean): string {
  return `<label class="choice"><input type="radio" name="${name}" value="${value}" ${selected ? 'checked' : ''}><span>${label}</span></label>`
}

function presetChoice(activePreset: PresetId, id: PresetId, label: string, description: string): string {
  return `<label class="preset-choice"><input type="radio" name="preset" value="${id}" ${activePreset === id ? 'checked' : ''}><span><b>${label}</b><small>${description}</small></span></label>`
}

function problemTypeChoice(settings: AppSettings, type: ProblemType): string {
  const label = problemTypeOptions.find(([candidate]) => candidate === type)?.[1] ?? type
  return `<label class="type-choice"><input type="checkbox" name="problemType" value="${type}" ${settings.problemTypes.includes(type) ? 'checked' : ''}><span><b aria-hidden="true">${problemTypeSymbols[type]}</b>${label}</span></label>`
}

export function problemTypePicker(settings: AppSettings): string {
  return `<div class="selection-summary"><div class="selection-summary-title"><b>已选题型</b><span>${settings.problemTypes.length} 种 · ${settings.count} 题</span></div><div class="selected-types" role="group" aria-label="选择题型">${problemTypeOptions.map(([type, label]) => {
    const selected = settings.problemTypes.includes(type)
    return `<button type="button" class="${selected ? 'selected' : ''}" data-toggle-type="${type}" aria-pressed="${selected}"><span class="selected-type-icon" aria-hidden="true">${problemTypeSymbols[type]}</span><span>${label}</span><span class="selected-type-state" aria-hidden="true">${selected ? '✓' : '＋'}</span></button>`
  }).join('')}</div><p>可跨标签多选，选中的题型会尽量均匀混合组卷。</p></div>`
}

export function renderSettingsControls(state: SettingsViewState): string {
  const { settings, customLimit, useCustomLimit, activePreset, activeSettingsTab, paperStyle, includeAnswers, copies } = state
  const tabs = settingsTabs.map(([id, label, description]) =>
    `<button type="button" role="tab" id="tab-${id}" class="settings-tab ${activeSettingsTab === id ? 'active' : ''}" data-tab="${id}" aria-controls="panel-${id}" aria-selected="${activeSettingsTab === id}" tabindex="${activeSettingsTab === id ? 0 : -1}"><b>${label}</b><small>${description}</small></button>`).join('')
  const rangeContext = `<div class="range-context"><label><span>当前基础数字范围</span><select name="rangeShortcut" aria-label="当前基础数字范围">${limitPresets.map((limit) => `<option value="${limit}" ${!useCustomLimit && settings.limit === limit ? 'selected' : ''}>${limit} 以内</option>`).join('')}<option value="custom" ${useCustomLimit ? 'selected' : ''}>自定义${useCustomLimit ? `：${settings.limit} 以内` : '（详细设置）'}</option></select></label><p>用于口算、填空、比较、填运算符、竖式、有余数除法和小数；口诀、时间、人民币、单位和分数使用各自专项范围。</p></div>`
  const basics = `<div class="settings-panel ${activeSettingsTab === 'basics' ? 'active' : ''}" data-panel="basics">
    <div class="control-card preset-card"><div class="card-title"><span class="title-icon blue">A1</span><div><h3>现在学到哪儿？</h3><p>一键选择适合的练习难度</p></div></div><fieldset><legend>年级与难度预设</legend><div class="preset-grid">${settingsPresets.map((preset) =>
      presetChoice(activePreset, preset.id, preset.label, preset.description)).join('')}${presetChoice(activePreset, 'custom', '自定义', '保留当前设置')}</div></fieldset><p class="preset-hint">预设只调整范围、运算和数字个数，选好后仍可继续修改。</p></div>
    <div class="control-card"><div class="card-title"><span class="title-icon lavender">A2</span><div><h3>数字到哪里？</h3><p>基础数字范围的详细设置</p></div></div><fieldset><legend>数字范围</legend><div class="choice-row range-options">${limitPresets.map((n) => choice('limit', n, `${n} 以内`, !useCustomLimit && settings.limit === n)).join('')}${choice('limit', 'custom', '自定义', useCustomLimit)}</div><label class="custom-range">自定义上限（2～200）<input type="number" name="customLimit" min="2" max="200" step="1" value="${customLimit}" inputmode="numeric"></label></fieldset></div>
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
    <div class="control-card"><div class="card-title"><span class="title-icon peach">B1</span><div><h3>题型专项</h3><p>多选后平均分配并打乱</p></div></div><fieldset><legend>选择一种或多种题型</legend><div class="type-grid">${specialtyTypes.map((type) => problemTypeChoice(settings, type)).join('')}</div></fieldset><p class="preset-hint">填空位置随机；比较题包含数字与算式；填运算符使用加减乘除。</p></div>
    ${settings.problemTypes.includes('multiplication') ? `<div class="control-card"><div class="card-title"><span class="title-icon yellow">B2</span><div><h3>九九乘法专项</h3><p>乘法、除法和缺项正反练习</p></div></div><fieldset><legend>选择要练的口诀段</legend><div class="choice-row table-options">${allMultiplicationTables.map((table) =>
      `<label class="choice"><input type="checkbox" name="multiplicationTable" value="${table}" ${settings.multiplicationTables.includes(table) ? 'checked' : ''}><span>${table} 的口诀</span></label>`).join('')}</div></fieldset><p class="preset-hint">口诀固定为 2～9，乘积不超过 81，不使用基础计算的数字上限。</p></div>` : ''}
  </div>`
  const life = `<div class="settings-panel ${activeSettingsTab === 'life' ? 'active' : ''}" data-panel="life">
    <div class="control-card"><div class="card-title"><span class="title-icon mint">C1</span><div><h3>生活与拓展数学</h3><p>小学基础范围，适合综合复习</p></div></div><fieldset><legend>选择一种或多种题型</legend><div class="type-grid">${lifeTypes.map((type) => problemTypeChoice(settings, type)).join('')}</div></fieldset></div>
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
  return `<nav class="settings-tabs" role="tablist" aria-label="设置分类">${tabs}</nav>${rangeContext}${panels}`
}
