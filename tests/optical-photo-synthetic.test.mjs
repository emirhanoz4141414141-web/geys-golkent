import assert from 'node:assert/strict'
import { test } from 'node:test'
import { measurePhotoPage } from '../app/lib/opticalPhotoMeasure.js'
import { buildPrintPages, PAPER, REGISTRATION_MARKS } from '../app/lib/opticalTemplate.js'
import { computeHomography, mapHomography } from '../app/lib/opticalPerspective.js'

const SCALE=4
const WIDTH=PAPER.width*SCALE
const HEIGHT=PAPER.height*SCALE
const CORNERS=[{x:0,y:0},{x:WIDTH,y:0},{x:WIDTH,y:HEIGHT},{x:0,y:HEIGHT}]

function makeSyntheticPage(questionCount,pageNumber,marks={}){
  const data=new Uint8ClampedArray(WIDTH*HEIGHT*4)
  data.fill(255)
  for(const row of buildPrintPages(questionCount)[pageNumber-1].rows){
    const choices=marks[row.number]||[]
    for(const option of choices){
      const bubble=row.bubbles.find(b=>b.option===option)
      if(!bubble)throw new Error('Invalid synthetic option')
      const x=bubble.x*SCALE,y=bubble.y*SCALE,r=PAPER.bubbleRadius*SCALE*0.48
      for(let py=Math.floor(y-r);py<=Math.ceil(y+r);py++){
        for(let px=Math.floor(x-r);px<=Math.ceil(x+r);px++){
          if((px-x)**2+(py-y)**2<=r*r){
            const offset=(py*WIDTH+px)*4
            data[offset]=data[offset+1]=data[offset+2]=0
          }
        }
      }
    }
  }
  return {width:WIDTH,height:HEIGHT,data}
}

test('40-question synthetic A4 image: marked, blank, and multiple marks',()=>{
  const image=makeSyntheticPage(40,1,{1:['A'],2:['D'],3:['B','C']})
  const result=measurePhotoPage(image,CORNERS,{questionCount:40,pageNumber:1})
  assert.equal(result.pageNumber,1)
  assert.equal(result.rows.length,40)
  assert.deepEqual(result.rows.slice(0,4).map(r=>r.status),['marked','marked','review','blank'])
  assert.deepEqual(result.rows.slice(0,2).map(r=>r.answer),['A','D'])
  assert.equal(result.rows[2].reason,'multiple_marks')
  assert.equal(result.requiresReview,true)
  assert.equal(result.publishable,false)
})

test('multi-page global question numbers are preserved',()=>{
  const image=makeSyntheticPage(81,3,{81:['C']})
  const result=measurePhotoPage(image,CORNERS,{questionCount:81,pageNumber:3})
  assert.equal(result.pageNumber,3)
  assert.equal(result.pageCount,3)
  assert.equal(result.rows.length,1)
  assert.equal(result.rows[0].number,81)
  assert.equal(result.rows[0].answer,'C')
})

test('invalid corners and page numbers are rejected',()=>{
  const image=makeSyntheticPage(20,1)
  assert.throws(()=>measurePhotoPage(image,[CORNERS[0],CORNERS[2],CORNERS[1],CORNERS[3]],{questionCount:20,pageNumber:1}))
  assert.throws(()=>measurePhotoPage(image,CORNERS,{questionCount:20,pageNumber:2}),/Sayfa numarası/)
})

test('very dark photos are rejected instead of being graded',()=>{
  const image=makeSyntheticPage(20,1)
  for(let i=0;i<image.data.length;i+=4)image.data[i]=image.data[i+1]=image.data[i+2]=0
  assert.throws(()=>measurePhotoPage(image,CORNERS,{questionCount:20,pageNumber:1}),/çok karanlık/)
})

test('corners outside image are rejected before pixel sampling',()=>{
  const image=makeSyntheticPage(20,1)
  const outside=CORNERS.map(p=>({x:p.x+2000,y:p.y+2000}))
  assert.throws(()=>measurePhotoPage(image,outside,{questionCount:20,pageNumber:1}),/fotoğraf sınırları dışında/)
})

test('tiny paper quadrilateral is rejected before classification',()=>{
  const image=makeSyntheticPage(20,1)
  const tiny=[{x:10,y:10},{x:110,y:10},{x:110,y:150},{x:10,y:150}]
  assert.throws(()=>measurePhotoPage(image,tiny,{questionCount:20,pageNumber:1}),/çok küçük/)
})

test('registration mark geometry must not be used as physical A4 corners',()=>{
  const image=makeSyntheticPage(20,1,{1:['B'],2:['D']})
  const marks=REGISTRATION_MARKS.map(p=>({x:p.x*SCALE,y:p.y*SCALE}))
  const transform=computeHomography(REGISTRATION_MARKS,marks)
  const physicalCorners=[{x:0,y:0},{x:PAPER.width,y:0},{x:PAPER.width,y:PAPER.height},{x:0,y:PAPER.height}]
    .map(p=>mapHomography(transform,p))
  const measured=measurePhotoPage(image,physicalCorners,{questionCount:20,pageNumber:1})
  assert.equal(measured.rows[0].answer,'B')
  assert.equal(measured.rows[1].answer,'D')
  assert.equal(measured.rows[2].status,'blank')
  // Inner registration marks are not interchangeable with physical paper corners.
  const incorrectlyAligned=measurePhotoPage(image,marks,{questionCount:20,pageNumber:1})
  assert.notDeepEqual(incorrectlyAligned.rows.slice(0,2).map(r=>r.answer),['B','D'])
})

test('tamamı boş okunan sayfa otomatik geçerli kabul edilmez',()=>{
  const image=makeSyntheticPage(20,1)
  const result=measurePhotoPage(image,CORNERS,{questionCount:20,pageNumber:1})
  assert.equal(result.requiresReview,true)
  assert.equal(result.rows.every(row=>row.status==='review'),true)
  assert.equal(result.rows[0].reason,'all_blank_requires_confirmation')
  assert.equal(result.publishable,false)
})
