/**
 * Optik okuyucu aday sonuçlarının güvenli sınıflandırılması.
 * Bu fonksiyon kamera görüntüsü çözümlemez; görüntü işleme katmanının
 * verdiği 0..1 doluluk oranlarını kontrol eder.
 * Şüpheli satırlar otomatik doğru/yanlış sayılmaz.
 */
import { OPTICAL_OPTIONS } from './opticalLayout.js'

export function classifyOpticalMarks(fills, { markedThreshold = 0.65, blankThreshold = 0.25, minGap = 0.2 } = {}) {
  if (!Array.isArray(fills) || fills.length !== 4 ||
      fills.some(v => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1)) {
    throw new Error('Dört seçeneğin geçerli doluluk oranları gereklidir.')
  }
  if (![markedThreshold, blankThreshold, minGap].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1) ||
      blankThreshold >= markedThreshold) {
    throw new Error('Optik okuma eşikleri geçersiz.')
  }
  const ranked = fills.map((fill, index) => ({ option: OPTICAL_OPTIONS[index], fill }))
    .sort((a, b) => b.fill - a.fill)
  const marked = ranked.filter(item => item.fill >= markedThreshold)
  if (marked.length > 1) return { status: 'review', answer: null, reason: 'multiple_marks' }
  if (ranked[0].fill <= blankThreshold) return { status: 'blank', answer: '' }
  if (marked.length === 0) return { status: 'review', answer: null, reason: 'weak_mark' }
  if (ranked[0].fill - ranked[1].fill < minGap) {
    return { status: 'review', answer: null, reason: 'ambiguous_mark' }
  }
  return { status: 'marked', answer: ranked[0].option }
}

export function classifyOpticalSheet(rows, expectedCount, settings) {
  if (!Number.isInteger(expectedCount) || expectedCount < 1 || expectedCount > 200 ||
      !Array.isArray(rows) || rows.length !== expectedCount) {
    throw new Error('Optik satır sayısı sınav soru sayısıyla eşleşmiyor.')
  }
  const results = rows.map(row => classifyOpticalMarks(row, settings))
  return {
    results,
    answers: results.map(result => result.status === 'review' ? 'REVIEW' : result.answer),
    requiresReview: results.some(result => result.status === 'review')
  }
}
