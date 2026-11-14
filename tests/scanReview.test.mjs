import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareScanReview, finalizeScanReview } from '../app/lib/scanReview.js'

const draft = () => prepareScanReview({
  rows: [[0.92,0.02,0.01,0.02],[0.74,0.7,0.01,0.02]],
  answerKey: ['A','B'], examCode: 'TEC-02', scannedExamCode: 'TEC-02', studentId: 'test-student'
})
test('belirsiz tarama insan kontrolüne alınır ve yayımlanamaz', () => {
  const result = draft()
  assert.equal(result.status, 'awaiting_review')
  assert.equal(result.publishable, false)
  assert.equal(result.requiresManualReview, true)
  assert.equal(result.provisional.review, 1)
})
test('sınav kodu uyuşmazsa işlem durdurulur', () => {
  assert.throws(() => prepareScanReview({
    rows:[[0.9,0,0,0]],answerKey:['A'],examCode:'TEC-02',
    scannedExamCode:'TEC-03',studentId:'test-student'
  }))
})
test('öğrenci kimliği eşleşmeden işlem durdurulur', () => {
  assert.throws(() => prepareScanReview({
    rows:[[0.9,0,0,0]],answerKey:['A'],examCode:'TEC-02',
    scannedExamCode:'TEC-02',studentId:''
  }))
})
test('öğretici onayı olmadan sonuç kesinleşmez', () => {
  const prepared = draft()
  assert.throws(() => finalizeScanReview({ prepared, correctedAnswers:['A','B'], reviewerId:'teacher', approved:false }))
})
test('belirsiz cevap çözülmeden sonuç kesinleşmez', () => {
  const prepared = draft()
  assert.throws(() => finalizeScanReview({ prepared, correctedAnswers:['A','REVIEW'], reviewerId:'teacher', approved:true }))
})
test('onaylı cevaplar dahi otomatik olarak veliye yayımlanmaz', () => {
  const result = finalizeScanReview({ prepared:draft(), correctedAnswers:['A','B'], reviewerId:'teacher', approved:true })
  assert.equal(result.status,'reviewed')
  assert.equal(result.publishable,false)
  assert.deepEqual(result.answers,['A','B'])
})
