/**
 * Sınav taslağı doğrulama. Yalnızca bellekte çalışır; veri yazmaz.
 * Öğrenci bilgileri, TC kimlik numaraları veya cevap kâğıdı görüntüleri içermez.
 */
import { CHOICES, validateAnswerKey } from './examGrading.js'

export function validateExamDraft(draft) {
  const errors = []
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return { valid: false, errors: ['Sınav bilgileri geçersiz.'] }
  }
  const title = String(draft.title ?? '').trim()
  if (title.length < 3 || title.length > 180) errors.push('Sınav adı 3-180 karakter olmalıdır.')
  const questions = draft.questions
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 200) {
    errors.push('Soru sayısı 1-200 arasında olmalıdır.')
    return { valid: false, errors }
  }
  questions.forEach((question, i) => {
    const n = i + 1
    if (!question || typeof question !== 'object') {
      errors.push(`${n}. soru geçersiz.`)
      return
    }
    if (!String(question.text ?? '').trim()) errors.push(`${n}. soru metni boş olamaz.`)
    if (!Array.isArray(question.options) || question.options.length !== CHOICES.length ||
        question.options.some(x => !String(x ?? '').trim())) {
      errors.push(`${n}. soruda A, B, C, D seçeneklerinin tamamı bulunmalıdır.`)
    }
    try { validateAnswerKey([question.correctAnswer]) }
    catch { errors.push(`${n}. sorunun doğru cevabı A, B, C veya D olmalıdır.`) }
  })
  return { valid: errors.length === 0, errors }
}
