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
  // Geçerli dörtgen bile fotoğraf sınırları dışında olabilir. Bu durumda
  // piksel örnekleyici sınır dışına taşmadan güvenli şekilde reddet.
  if(corners.some(p=>p.x<0||p.y<0||p.x>=image.width||p.y>=image.height)){
    throw new Error('Kâğıt köşeleri fotoğraf sınırları dışında. Köşeleri yeniden seçiniz.')
  }
  const top=Math.hypot(corners[1].x-corners[0].x,corners[1].y-corners[0].y)
  const bottom=Math.hypot(corners[2].x-corners[3].x,corners[2].y-corners[3].y)
  const left=Math.hypot(corners[3].x-corners[0].x,corners[3].y-corners[0].y)
  const right=Math.hypot(corners[2].x-corners[1].x,corners[2].y-corners[1].y)
  if(Math.min(top,bottom)<180||Math.min(left,right)<250){
    throw new Error('Kâğıt fotoğrafta çok küçük veya aşırı eğik. Daha yakından ve düz açıyla çekiniz.')
  }
  // Fotoğrafın genel ışık durumunu seyrek örneklemeyle kontrol et.
  // Bu eşikler ilk güvenlik kontrolüdür; gerçek kamera testleriyle kalibre edilmelidir.
  let sum = 0, samples = 0
  const stride = Math.max(1,Math.floor(Math.sqrt(image.width*image.height/4000)))
  for(let y=0;y<image.height;y+=stride) for(let x=0;x<image.width;x+=stride){
    const k=(y*image.width+x)*4
    const alpha=image.data[k+3]
    if(alpha<250)throw new Error('Saydam fotoğraf optik okumaya uygun değil.')
    const luminance=(0.2126*image.data[k]+0.7152*image.data[k+1]+0.0722*image.data[k+2])/255
    sum+=luminance;samples++
  }
  const average=sum/samples
  if(average<0.22)throw new Error('Fotoğraf çok karanlık. Daha aydınlık ortamda yeniden çekiniz.')
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
