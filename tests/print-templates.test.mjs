import test from 'node:test'
import assert from 'node:assert/strict'
import { printTemplates } from './modules.mjs'

test('print page markup includes QR, fifty problems and escaped answers', () => {
  const settings = {
    count: 50, limit: 20, operations: ['+', '−'], operands: 2,
    additionRegrouping: 'any', subtractionRegrouping: 'any',
    problemTypes: ['calculation'], multiplicationTables: [2, 3, 4, 5, 6, 7, 8, 9],
  }
  const worksheet = {
    repeated: 0,
    problems: Array.from({ length: 50 }, (_, index) => ({
      text: `${index + 1} + 1`,
      answer: index + 2,
      type: 'calculation',
    })),
  }
  const ctx = {
    settings,
    paperStyle: 'plain',
    copies: 1,
    qrImages: ['data:image/png;base64,abc'],
    sheetUrlForCopy: () => 'https://example.test/?sheet=1',
  }
  const html = printTemplates.printPage(ctx, worksheet, 0, 0)
  assert(html.includes('扫码看答案'))
  assert(html.includes('paper-scroll') === false)
  assert(html.includes('class="problem-number">1.'))
  assert.equal((html.match(/class="problem /g) ?? []).length, 50)
  assert(!html.includes('<script>'))
  const answerHtml = printTemplates.answerPage(ctx, worksheet, 0)
  assert(answerHtml.includes('参考答案'))
  assert(!answerHtml.includes('&lt;script&gt;'))
})

test('each paper style renders the expected page pattern', () => {
  const base = { count: 50, limit: 20, operands: 2, operations: ['+'], problemTypes: ['calculation'], multiplicationTables: [2] }
  const worksheet = { repeated: 0, problems: [{ text: '1 + 1', answer: 2, type: 'calculation' }] }
  const ctx = { settings: { ...base, additionRegrouping: 'any', subtractionRegrouping: 'any' }, paperStyle: 'plain', copies: 1, qrImages: [], sheetUrlForCopy: () => '#' }
  for (const paperStyle of ['plain', 'squares', 'large-squares', 'lines', 'double-lines', 'dots', 'tianzi', 'mi']) {
    const html = printTemplates.printPage({ ...ctx, paperStyle }, worksheet, 0, 0)
    if (paperStyle === 'plain') assert(!html.includes('page-pattern'))
    else {
      assert(html.includes(`pattern-${paperStyle}`), paperStyle)
      assert(html.includes('paper-' + paperStyle))
    }
  }
})
