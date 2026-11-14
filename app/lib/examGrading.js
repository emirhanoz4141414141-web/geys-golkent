/**
 * E-GÖLKENT sınav değerlendirme çekirdeği.
 * Saf fonksiyonlar: veritabanı, ağ, tarayıcı veya canlı öğrenci kaydı değiştirmez.
 * Optik işaret tanıma ayrı bir aşamadır; bu modül doğrulanmış cevapları puanlar.
 */
export const CHOICES = Object.freeze(['A', 'B', 'C', 'D'])

export function validateAnswerKey(answerKey) {
  if (!Array.isArray(answerKey) || answerKey.length === 0) {
    throw new Error('Cevap anahtarı boş olamaz.')
  }
  return answerKey.map((answer, index) => {
    const value = String(answer ?? '').trim().toUpperCase()
    if (!CHOICES.includes(value)) {
      throw new Error(`${index + 1}. sorunun cevap anahtarı geçersiz.`)
    }
    return value
  })
}

export function gradeExam({ answerKey, answers, pointsPerQuestion = null }) {
  const key = validateAnswerKey(answerKey)
  if (!Array.isArray(answers) || answers.length !== key.length) {
    throw new Error('Cevap sayısı soru sayısıyla eşleşmiyor.')
  }
  const point = pointsPerQuestion == null ? 100 / key.length : Number(pointsPerQuestion)
  if (!Number.isFinite(point) || point < 0) {
    throw new Error('Soru puanı geçersiz.')
  }
  let correct = 0, wrong = 0, blank = 0, review = 0
  const details = key.map((expected, index) => {
    const raw = answers[index]
    const marked = raw == null ? '' : String(raw).trim().toUpperCase()
    let status
    if (!marked) { status = 'blank'; blank++ }
    else if (!CHOICES.includes(marked)) { status = 'review'; review++ }
    else if (marked === expected) { status = 'correct'; correct++ }
    else { status = 'wrong'; wrong++ }
    return { question: index + 1, expected, marked, status, points: status === 'correct' ? point : 0 }
  })
  return {
    questionCount: key.length, correct, wrong, blank, review,
    score: Math.round(correct * point * 100) / 100,
    maximumScore: Math.round(key.length * point * 100) / 100,
    requiresReview: review > 0,
    details
  }
}
