import { validatePaperCorners } from './opticalGeometry.js'
import { computeHomography, mapHomography } from './opticalPerspective.js'
import { PAPER, REGISTRATION_MARKS } from './opticalTemplate.js'

/**
 * Temkinli otomatik A4 sınır tahmini: koyu zemin üzerindeki açık kâğıt.
 * Yalnızca belirgin kontrastta aday üretir. Belirsiz görüntüde null döner.
 * Bu algoritma perspektifli, açık renk zeminli veya karmaşık fotoğrafları
 * güvenilir biçimde desteklediğini iddia etmez.
 */

// Basılı formun dört köşesindeki koyu kayıt işaretlerini arar.
// Bu yöntem yalnızca yeterince büyük ve birbirinden ayrık işaretleri aday kabul eder.
function detectRegistrationMarks(image){
  const {width:w,height:h,data}=image
  const regions=[
    [0,w*.28,0,h*.28],[w*.72,w,0,h*.28],
    [w*.72,w,h*.72,h],[0,w*.28,h*.72,h]
  ]
  // Koyu arka plan veya bütünüyle koyu fotoğraf, kayıt işareti sayılmamalıdır.
  let darkSamples=0,allSamples=0
  const sampleStep=Math.max(3,Math.floor(Math.min(w,h)/80))
  for(let y=0;y<h;y+=sampleStep)for(let x=0;x<w;x+=sampleStep){
    const k=(y*w+x)*4
    if(data[k+3]<250)return null
    const lum=(.2126*data[k]+.7152*data[k+1]+.0722*data[k+2])/255
    if(lum<.19)darkSamples++
    allSamples++
  }
  if(darkSamples/allSamples>.16)return null
  const points=[]
  for(const [x0,x1,y0,y1] of regions){
    // Bağlı koyu bileşenlerden yalnızca yaklaşık kare ve dolu olanları
    // kabul et. Izgara hücresindeki en koyu alanı seçmek; gölge, başlık
    // ve cevap işaretlerini kayıt karesi sanabiliyordu.
    const left=Math.floor(x0),top=Math.floor(y0)
    const rw=Math.ceil(x1)-left,rh=Math.ceil(y1)-top
    const mask=new Uint8Array(rw*rh),seen=new Uint8Array(rw*rh)
    for(let yy=0;yy<rh;yy++)for(let xx=0;xx<rw;xx++){
      const k=((top+yy)*w+left+xx)*4
      const lum=(.2126*data[k]+.7152*data[k+1]+.0722*data[k+2])/255
      if(lum<.28)mask[yy*rw+xx]=1
    }
    const candidates=[]
    const minSide=Math.max(5,Math.round(Math.min(w,h)*.009))
    const maxSide=Math.max(18,Math.round(Math.min(w,h)*.052))
    for(let yy=0;yy<rh;yy++)for(let xx=0;xx<rw;xx++){
      const origin=yy*rw+xx
      if(!mask[origin]||seen[origin])continue
      const queue=[origin];seen[origin]=1
      let count=0,minX=xx,maxX=xx,minY=yy,maxY=yy,sumX=0,sumY=0
      for(let qi=0;qi<queue.length;qi++){
        const at=queue[qi],cx=at%rw,cy=Math.floor(at/rw)
        count++;sumX+=cx;sumY+=cy
        minX=Math.min(minX,cx);maxX=Math.max(maxX,cx)
        minY=Math.min(minY,cy);maxY=Math.max(maxY,cy)
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const nx=cx+dx,ny=cy+dy
          if(nx<0||ny<0||nx>=rw||ny>=rh)continue
          const ni=ny*rw+nx
          if(mask[ni]&&!seen[ni]){seen[ni]=1;queue.push(ni)}
        }
      }
      const bw=maxX-minX+1,bh=maxY-minY+1
      if(bw<minSide||bh<minSide||bw>maxSide||bh>maxSide)continue
      if(Math.min(bw,bh)/Math.max(bw,bh)<.72||count/(bw*bh)<.70)continue
      if(minX===0||minY===0||maxX===rw-1||maxY===rh-1)continue
      candidates.push({count,x:left+sumX/count,y:top+sumY/count})
    }
    candidates.sort((a,b)=>b.count-a.count)
    if(!candidates.length)return null
    points.push({x:candidates[0].x,y:candidates[0].y})
  }
  if(!validatePaperCorners(points,{minArea:w*h*.24}).valid)return null
  // Kayıt işaretleri kâğıdın fiziksel köşesi değil, kenardan 12 mm içeridedir.
  // İşaret merkezlerinden fiziksel A4 köşelerine perspektif dönüşümü uygula.
  try{
    const transform=computeHomography(REGISTRATION_MARKS,points)
    const corners=[{x:0,y:0},{x:PAPER.width,y:0},{x:PAPER.width,y:PAPER.height},{x:0,y:PAPER.height}]
      .map(point=>mapHomography(transform,point))
    if(corners.some(point=>point.x<0||point.y<0||point.x>=w||point.y>=h))return null
    if(!validatePaperCorners(corners,{minArea:w*h*.3}).valid)return null
    return {corners,method:'registration-mark-candidates',requiresConfirmation:true}
  }catch{return null}
}

export function detectPaperCorners(image) {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) ||
      image.width < 240 || image.height < 320 || !image.data ||
      image.data.length !== image.width*image.height*4) return null
  const markCandidate=detectRegistrationMarks(image)
  if(markCandidate)return markCandidate
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
