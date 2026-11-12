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
