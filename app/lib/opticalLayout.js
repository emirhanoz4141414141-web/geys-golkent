/**
 * Optik cevap formu şablon doğrulaması.
 * Sadece baskı düzeni üretir; kamera ile işaret tanıma henüz uygulanmamıştır.
 */
export const OPTICAL_OPTIONS = Object.freeze(['A', 'B', 'C', 'D'])
export function buildOpticalLayout({ questionCount = 20, examCode = '' } = {}) {
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 200) {
    throw new Error('Optik form 1-200 soru içermelidir.')
  }
  if (typeof examCode !== 'string' || examCode.length > 40) {
    throw new Error('Sınav kodu geçersiz.')
  }
  return {
    examCode: examCode.trim(),
    questionCount,
    options: [...OPTICAL_OPTIONS],
    rows: Array.from({ length: questionCount }, (_, index) => ({
      number: index + 1,
      bubbles: OPTICAL_OPTIONS.map(option => ({ option, label: `${index + 1}-${option}` }))
    }))
  }
}
