import { validatePaperCorners } from './opticalGeometry.js'

/**
 * Temkinli otomatik A4 sınır tahmini: koyu zemin üzerindeki açık kâğıt.
 * Yalnızca belirgin kontrastta aday üretir. Belirsiz görüntüde null döner.
 * Bu algoritma perspektifli, açık renk zeminli veya karmaşık fotoğrafları
 * güvenilir biçimde desteklediğini iddia etmez.
 */
export function detectPaperCorners(image) {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) ||
      image.width < 240 || image.height < 320 || !image.data ||
      image.data.length !== image.width*image.height*4) return null
  const {width:w,height:h,data}=image
  const step=Math.max(2,Math.floor(Math.min(w,h)/180))
  let minX=w,minY=h,maxX=-1,maxY=-1,bright=0,total=0,edgeBright=0,edgeTotal=0
  for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
    const k=(y*w+x)*4
    if(data[k+3]<250)return null
    const light=(data[k]*.2126+data[k+1]*.7152+data[k+2]*.0722)/255
    const onEdge=x<w*.06||x>w*.94||y<h*.06||y>h*.94
    if(onEdge){edgeTotal++;if(light>.72)edgeBright++}
    total++
    if(light>.78){bright++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
  }
  if(!total||!edgeTotal||edgeBright/edgeTotal>.08||bright/total<.18||bright/total>.85)return null
  if(maxX-minX<w*.35||maxY-minY<h*.35)return null
  const corners=[{x:minX,y:minY},{x:maxX,y:minY},{x:maxX,y:maxY},{x:minX,y:maxY}]
  if(!validatePaperCorners(corners,{minArea:w*h*.15}).valid)return null
  // Dikdörtgen sınır yalnızca adaydır; öğretici gözle doğrulamalıdır.
  return {corners,method:'light-paper-dark-background',requiresConfirmation:true}
}
