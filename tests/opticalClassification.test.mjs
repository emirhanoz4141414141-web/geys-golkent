import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyOpticalMarks, classifyOpticalSheet } from '../app/lib/opticalClassification.js'

test('belirgin tek işaret doğru seçenek olarak ayrılır', () => {
  assert.deepEqual(classifyOpticalMarks([0.05,0.92,0.1,0.08]), { status:'marked', answer:'B' })
})
test('tamamen boş satır boş sayılır', () => {
  assert.deepEqual(classifyOpticalMarks([0.03,0.04,0.02,0.01]), { status:'blank', answer:'' })
})
test('çift işaretli satır otomatik puanlanmaz', () => {
  assert.equal(classifyOpticalMarks([0.8,0.75,0.05,0.02]).reason, 'multiple_marks')
})
test('silik işaret insan kontrolüne ayrılır', () => {
  assert.equal(classifyOpticalMarks([0.4,0.05,0.04,0.02]).reason, 'weak_mark')
})
test('birbirine yakın iki doluluk insan kontrolüne ayrılır', () => {
  assert.equal(classifyOpticalMarks([0.7,0.55,0.04,0.02]).reason, 'ambiguous_mark')
})
test('geçersiz doluluk oranları reddedilir', () => {
  assert.throws(() => classifyOpticalMarks([1.2,0,0,0]))
  assert.throws(() => classifyOpticalMarks([NaN,0,0,0]))
})
test('formun tamamı soru sayısıyla doğrulanır', () => {
  const r=classifyOpticalSheet([[0.9,0,0,0],[0.7,0.7,0,0]],2)
  assert.deepEqual(r.answers,['A','REVIEW'])
  assert.equal(r.requiresReview,true)
  assert.throws(()=>classifyOpticalSheet([[0.9,0,0,0]],2))
})
