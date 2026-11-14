/**
 * Optik tarama sonuçlarının insan onayı olmadan kesinleşmesini önler.
 * Saf fonksiyonlar: öğrenci kaydı, veritabanı veya veli ekranına yazmaz.
 */
import { gradeExam } from './examGrading.js'
import { classifyOpticalSheet } from './opticalClassification.js'

export function prepareScanReview({ rows, answerKey, examCode, scannedExamCode, studentId }) {
  if (!Array.isArray(answerKey) || answerKey.length === 0) {
    throw new Error('Geçerli cevap anahtarı gereklidir.')
  }
  if (typeof examCode !== 'string' || !examCode.trim() ||
      typeof scannedExamCode !== 'string' || scannedExamCode.trim() !== examCode.trim()) {
    throw new Error('Sınav kodu eşleşmedi; tarama reddedildi.')
  }
  if (typeof studentId !== 'string' || !studentId.trim()) {
    throw new Error('Öğrenci eşleştirilmeden tarama kabul edilmez.')
  }
  const scan = classifyOpticalSheet(rows, answerKey.length)
  const provisional = gradeExam({ answerKey, answers: scan.answers })
  return {
    examCode: examCode.trim(),
    studentId: studentId.trim(),
    answers: scan.answers,
    classifications: scan.results,
    provisional,
    status: 'awaiting_review',
    publishable: false,
    requiresManualReview: scan.requiresReview,
  }
}

export function finalizeScanReview({ prepared, correctedAnswers, reviewerId, approved }) {
  if (!prepared || prepared.status !== 'awaiting_review' || prepared.publishable !== false) {
    throw new Error('Geçerli inceleme taslağı gereklidir.')
  }
  if (typeof reviewerId !== 'string' || !reviewerId.trim()) {
    throw new Error('İnceleyen öğretici belirtilmelidir.')
  }
  if (approved !== true) throw new Error('Açık öğretici onayı gereklidir.')
  if (!Array.isArray(correctedAnswers) || correctedAnswers.length !== prepared.answers.length) {
    throw new Error('İncelenen cevap sayısı geçersiz.')
  }
  const answers = correctedAnswers.map(v => String(v ?? '').trim().toUpperCase())
  if (answers.some(v => !['', 'A', 'B', 'C', 'D'].includes(v))) {
    throw new Error('Belirsiz işaretler çözülmeden sonuç kesinleştirilemez.')
  }
  // İnceleme sonucu yalnızca onay durumunu ve doğrulanmış cevapları verir.
  // Not hesaplaması için cevap anahtarı ayrıca, güvenli sunucu tarafında kullanılmalıdır.
  return {
    examCode: prepared.examCode,
    studentId: prepared.studentId,
    answers,
    reviewedBy: reviewerId.trim(),
    status: 'reviewed',
    publishable: false,
  }
}
