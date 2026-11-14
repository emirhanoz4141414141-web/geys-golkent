import { PAPER, buildPrintPages } from './opticalTemplate.js'
import { computeHomography, mapHomography } from './opticalPerspective.js'
import { measureOpticalRow } from './opticalPixels.js'
import { classifyOpticalSheet } from './opticalClassification.js'
import { validatePaperCorners } from './opticalGeometry.js'

/** Fotoğraf üzerinde, öğreticinin seçtiği dört gerçek A4 kâğıt köşesinden
 * soru kabarcıklarının piksel koordinatlarını tahmin eder.
 * Geometrik distorsiyon / düşük çözünürlük şüpheli sonuç olarak kalmalıdır.
 */
export function measurePhotoPage(image, corners, { questionCount = 20, pageNumber = 1 } = {}) {
  if (!validatePaperCorners(corners).valid) throw new Error('Fotoğrafın dört köşesi geçersiz.')
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) ||
      !image.data || image.data.length !== image.width * image.height * 4) {
    throw new Error('Geçerli fotoğraf piksel verisi gerekli.')
  }
  const pages = buildPrintPages(questionCount)
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pages.length) throw new Error('Sayfa numarası geçersiz.')
  const paperCorners = [{x:0,y:0},{x:PAPER.width,y:0},{x:PAPER.width,y:PAPER.height},{x:0,y:PAPER.height}]
  const matrix = computeHomography(paperCorners,corners)
  const measured = pages[pageNumber-1].rows.map(row => {
    const circles = row.bubbles.map(b => {
      const p = mapHomography(matrix,b)
      const edge = mapHomography(matrix,{x:b.x+PAPER.bubbleRadius,y:b.y})
      const edgeY = mapHomography(matrix,{x:b.x,y:b.y+PAPER.bubbleRadius})
      const radius = Math.min(Math.hypot(edge.x-p.x,edge.y-p.y),Math.hypot(edgeY.x-p.x,edgeY.y-p.y))
      // 3 px altındaki kabarcıklar mevcut piksel ölçüm yöntemiyle güvenilir okunamaz.
      if (!Number.isFinite(radius) || radius < 3) throw new Error('Fotoğraf çözünürlüğü veya kâğıt hizası yetersiz. Kâğıdı düz zeminde, daha yakından ve net çekiniz.')
      return {x:p.x,y:p.y,radius}
    })
    return {number:row.number,fills:measureOpticalRow(image,circles)}
  })
  const classified = classifyOpticalSheet(measured.map(r=>r.fills),measured.length)
  return {pageNumber,pageCount:pages.length,rows:measured.map((r,i)=>({
    ...r,...classified.results[i]
  })),requiresReview:classified.requiresReview,provisional:true,publishable:false}
}
