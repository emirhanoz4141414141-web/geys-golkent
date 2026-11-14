/** A4 baskı koordinatları (mm). Okuyucu aynı şablonu referans alacaktır. */
export const PAPER = Object.freeze({ width: 210, height: 297, pageCapacity: 40, rowsPerColumn: 20, bubbleRadius: 2.9 })
export const REGISTRATION_MARKS = Object.freeze([
  { x: 12, y: 12 }, { x: 198, y: 12 },
  { x: 198, y: 285 }, { x: 12, y: 285 }
])
const X = [[35, 46, 57, 68], [126, 137, 148, 159]]
export function buildPrintPages(questionCount) {
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 200) {
    throw new Error('Soru sayısı 1 ile 200 arasında olmalıdır.')
  }
  return Array.from({ length: Math.ceil(questionCount / PAPER.pageCapacity) }, (_, pageIndex) => {
    const first = pageIndex * PAPER.pageCapacity
    const count = Math.min(PAPER.pageCapacity, questionCount - first)
    return {
      pageNumber: pageIndex + 1,
      pageCount: Math.ceil(questionCount / PAPER.pageCapacity),
      rows: Array.from({ length: count }, (_, i) => {
        const column = Math.floor(i / PAPER.rowsPerColumn)
        const row = i % PAPER.rowsPerColumn
        return {
          number: first + i + 1,
          numberX: column === 0 ? 19 : 110,
          y: 99 + row * 8.5,
          bubbles: ['A', 'B', 'C', 'D'].map((option, j) => ({ option, x: X[column][j], y: 99 + row * 8.5 }))
        }
      })
    }
  })
}
