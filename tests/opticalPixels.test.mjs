import test from 'node:test'
import assert from 'node:assert/strict'
import { measureBubbleFill, measureOpticalRow } from '../app/lib/opticalPixels.js'
import { classifyOpticalMarks } from '../app/lib/opticalClassification.js'

function sampleImage() {
  const width=120,height=40
  const data=new Uint8ClampedArray(width*height*4).fill(255)
  const circles=[15,45,75,105].map(x=>({x,y:20,radius:10}))
  return {image:{data,width,height},circles}
}
function fillCircle(image,circle) {
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
    if((x-circle.x)**2+(y-circle.y)**2 <= (circle.radius*.55)**2){
      const p=(y*image.width+x)*4
      image.data[p]=image.data[p+1]=image.data[p+2]=0
    }
  }
}
test('beyaz optik kabarcık boş olarak sınıflanır',()=>{
  const {image,circles}=sampleImage()
  assert.equal(measureBubbleFill(image,circles[0]).fill,0)
  assert.equal(classifyOpticalMarks(measureOpticalRow(image,circles)).status,'blank')
})
test('karartılmış ikinci kabarcık B seçeneği olarak ayrılır',()=>{
  const {image,circles}=sampleImage();fillCircle(image,circles[1])
  assert.equal(classifyOpticalMarks(measureOpticalRow(image,circles)).answer,'B')
})
test('iki karartılmış kabarcık kontrol gerektirir',()=>{
  const {image,circles}=sampleImage();fillCircle(image,circles[0]);fillCircle(image,circles[1])
  assert.equal(classifyOpticalMarks(measureOpticalRow(image,circles)).reason,'multiple_marks')
})
test('görüntü dışına taşan koordinatlar reddedilir',()=>{
  const {image}=sampleImage()
  assert.throws(()=>measureBubbleFill(image,{x:1,y:1,radius:10}))
})
test('yanlış RGBA veri boyutu reddedilir',()=>{
  assert.throws(()=>measureBubbleFill({data:new Uint8Array(3),width:20,height:20},{x:10,y:10,radius:4}))
})

test('gölgeli gri kâğıtta koyu işaret, yerel karşılaştırmayla okunur',()=>{
  const {image,circles}=sampleImage()
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
    const v=Math.round(165-x*.32)
    const k=(y*image.width+x)*4
    image.data[k]=image.data[k+1]=image.data[k+2]=v
  }
  const target=circles[2]
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
    if((x-target.x)**2+(y-target.y)**2<=(target.radius*.55)**2){
      const k=(y*image.width+x)*4
      image.data[k]=image.data[k+1]=image.data[k+2]=65
    }
  }
  assert.equal(classifyOpticalMarks(measureOpticalRow(image,circles)).answer,'C')
})
test('gölgeli fakat işaretsiz gri kâğıt boş kalır',()=>{
  const {image,circles}=sampleImage()
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
    const k=(y*image.width+x)*4,v=Math.round(145-x*.2)
    image.data[k]=image.data[k+1]=image.data[k+2]=v
  }
  assert.equal(classifyOpticalMarks(measureOpticalRow(image,circles)).status,'blank')
})

test('açık kâğıt üzerindeki gri kurşun kalem işareti boş sayılmaz',()=>{
  const {image,circles}=sampleImage()
  const target=circles[1]
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
    const k=(y*image.width+x)*4
    image.data[k]=image.data[k+1]=image.data[k+2]=220
    if((x-target.x)**2+(y-target.y)**2<=(target.radius*.55)**2)
      image.data[k]=image.data[k+1]=image.data[k+2]=135
  }
  assert.equal(classifyOpticalMarks(measureOpticalRow(image,circles)).answer,'B')
})
test('açık gri kâğıt üzerinde işaret yoksa boş kalır',()=>{
  const {image,circles}=sampleImage()
  for(let i=0;i<image.data.length;i+=4)
    image.data[i]=image.data[i+1]=image.data[i+2]=220
  assert.equal(classifyOpticalMarks(measureOpticalRow(image,circles)).status,'blank')
})
