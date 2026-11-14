import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOpticalLayout } from '../app/lib/opticalLayout.js'

test('20 soruluk formda her soru için dört ayrı işaret bulunur', () => {
  const layout = buildOpticalLayout({ questionCount: 20, examCode: 'TEC-02' })
  assert.equal(layout.rows.length, 20)
  assert.deepEqual(layout.rows[0].bubbles.map(x => x.option), ['A', 'B', 'C', 'D'])
  assert.equal(layout.rows[19].number, 20)
  assert.equal(layout.examCode, 'TEC-02')
})
test('soru sayısı sınırları doğrulanır', () => {
  assert.throws(() => buildOpticalLayout({ questionCount: 0 }))
  assert.throws(() => buildOpticalLayout({ questionCount: 201 }))
})
test('uzun sınav kodu reddedilir', () => {
  assert.throws(() => buildOpticalLayout({ examCode: 'X'.repeat(41) }))
})
