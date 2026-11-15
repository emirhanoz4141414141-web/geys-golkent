import test from 'node:test'
import assert from 'node:assert/strict'
import { measurePhotoPage } from '../app/lib/opticalPhotoMeasure.js'
import { buildPrintPages, PAPER } from '../app/lib/opticalTemplate.js'
const scale=4
function sheet(count=1) {
 const width=PAPER.width*scale,height=PAPER.height*scale
 const data=new Uint8ClampedArray(width*height*4).fill(255)
 const corners=[{x:0,y:0},{x:width-1,y:0},{x:width-1,y:height-1},{x:0,y:height-1}]
 return {image:{width,height,data},corners}
}
test('tamamen boş beyaz sayfa doğrulama ister, kayıt izni vermez',()=>{
 const {image,corners}=sheet()
 const r=measurePhotoPage(image,corners,{questionCount:1})
 assert.equal(r.rows.length,1)
 assert.equal(r.rows[0].status,'review')
 assert.equal(r.rows[0].reason,'all_blank_requires_confirmation')
 assert.equal(r.requiresReview,true)
 assert.equal(r.publishable,false)
})
test('A seçeneği koyu işaretlenince aday cevabı belirler',()=>{
 const {image,corners}=sheet()
 const bubble=buildPrintPages(1)[0].rows[0].bubbles[0]
 const x=bubble.x*scale,y=bubble.y*scale
 for(let py=Math.floor(y-7);py<=y+7;py++)for(let px=Math.floor(x-7);px<=x+7;px++){
  if((px-x)**2+(py-y)**2<49){const k=(py*image.width+px)*4;image.data[k]=0;image.data[k+1]=0;image.data[k+2]=0}
 }
 const r=measurePhotoPage(image,corners,{questionCount:1})
 assert.equal(r.rows[0].status,'marked')
 assert.equal(r.rows[0].answer,'A')
 assert.equal(r.publishable,false)
})
test('yanlış sayfa numarası reddedilir',()=>{
 const {image,corners}=sheet()
 assert.throws(()=>measurePhotoPage(image,corners,{questionCount:1,pageNumber:2}))
})

test('düşük çözünürlüklü fotoğraf güvenli biçimde reddedilir',()=>{
 const width=210,height=297
 const data=new Uint8ClampedArray(width*height*4).fill(255)
 const corners=[{x:0,y:0},{x:width-1,y:0},{x:width-1,y:height-1},{x:0,y:height-1}]
 assert.throws(()=>measurePhotoPage({width,height,data},corners,{questionCount:1}),/çözünürlüğü/)
})

test('aşırı karanlık fotoğraf optik okuma öncesinde reddedilir',()=>{
 const {image,corners}=sheet()
 for(let i=0;i<image.data.length;i+=4){image.data[i]=10;image.data[i+1]=10;image.data[i+2]=10}
 assert.throws(()=>measurePhotoPage(image,corners,{questionCount:1}),/karanlık/)
})
