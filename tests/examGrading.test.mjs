import test from 'node:test'
import assert from 'node:assert/strict'
import { gradeExam, validateAnswerKey } from '../app/lib/examGrading.js'

test('20 soruluk tecvid sınavında her doğru cevap 5 puandır', () => {
  const key = Array(20).fill('A')
  const answers = [...Array(12).fill('A'), ...Array(5).fill('B'), ...Array(3).fill('')]
  const result = gradeExam({ answerKey: key, answers })
  assert.equal(result.score, 60)
  assert.equal(result.maximumScore, 100)
  assert.deepEqual([result.correct, result.wrong, result.blank, result.review], [12, 5, 3, 0])
})

test('çift işaretli veya belirsiz cevap puanlanmaz ve incelemeye düşer', () => {
  const result = gradeExam({ answerKey: ['A', 'B'], answers: ['A+B', 'B'] })
  assert.equal(result.requiresReview, true)
  assert.equal(result.score, 50)
  assert.equal(result.details[0].status, 'review')
})

test('eksik cevap dizisi kabul edilmez', () => {
  assert.throws(() => gradeExam({ answerKey: ['A', 'B'], answers: ['A'] }))
})

test('geçersiz cevap anahtarı kabul edilmez', () => {
  assert.throws(() => validateAnswerKey(['A', 'E']))
})
