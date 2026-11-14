import test from 'node:test'
import assert from 'node:assert/strict'
import { validateExamDraft } from '../app/lib/examDraft.js'

const good = () => ({
  title: 'Tecvid 1. Dönem 2. Yazılı',
  questions: [{ text: 'İzhar nedir?', options: ['Açık okumak', 'Gizlemek', 'Uzatmak', 'Durmak'], correctAnswer: 'A' }]
})
test('eksiksiz sınav taslağı geçerlidir', () => {
  assert.deepEqual(validateExamDraft(good()), { valid: true, errors: [] })
})
test('boş soru metni reddedilir', () => {
  const d = good(); d.questions[0].text = ' '
  assert.equal(validateExamDraft(d).valid, false)
})
test('eksik seçenek reddedilir', () => {
  const d = good(); d.questions[0].options = ['A', 'B']
  assert.equal(validateExamDraft(d).valid, false)
})
test('yanlış cevap anahtarı reddedilir', () => {
  const d = good(); d.questions[0].correctAnswer = 'E'
  assert.equal(validateExamDraft(d).valid, false)
})
test('boş sınav reddedilir', () => {
  assert.equal(validateExamDraft({ title: 'Tecvid', questions: [] }).valid, false)
})
