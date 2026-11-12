import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { advanced, links } from './modules.mjs'

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/golden-worksheets.json', import.meta.url), 'utf8'))

for (const fixture of fixtures) {
  test(`golden worksheet: ${fixture.id}`, () => {
    const worksheet = advanced.generateMixedWorksheet(fixture.settings, links.seededRandom(fixture.seed))
    assert.equal(worksheet.repeated, fixture.repeated)
    assert.deepEqual(worksheet.problems.map((problem) => problem.text), fixture.problemTexts)
    assert.deepEqual(worksheet.problems.map((problem) => problem.type), fixture.problemTypes)
    assert.equal(links.encodeSheet(fixture.settings, fixture.seed, fixture.copy), fixture.qr)
    const decoded = links.decodeSheet(fixture.qr)
    assert(decoded)
    assert.deepEqual(decoded.sheet.worksheet, worksheet)
  })
}
