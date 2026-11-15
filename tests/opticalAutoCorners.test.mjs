import test from 'node:test'
import assert from 'node:assert/strict'
import { detectPaperCorners } from '../app/lib/opticalAutoCorners.js'
function image(w,h,rect,bg=25,fg=250){
 const data=new Uint8ClampedArray(w*h*4)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4
  const v=rect&&x>=rect[0]&&x<=rect[2]&&y>=rect[1]&&y<=rect[3]?fg:bg
  data[k]=data[k+1]=data[k+2]=v;data[k+3]=255
 }
 return {width:w,height:h,data}
}
test('dark background with distinct white sheet produces review-only candidate',()=>{
 const result=detectPaperCorners(image(400,600,[55,70,340,530]))
 assert.ok(result)
 assert.equal(result.requiresConfirmation,true)
 assert.ok(result.corners[0].x>=50&&result.corners[0].x<=60)
})
test('uniform white and dark photos are rejected',()=>{
 assert.equal(detectPaperCorners(image(400,600,null,250)),null)
 assert.equal(detectPaperCorners(image(400,600,null,25)),null)
})
test('sheet touching image boundary is rejected',()=>{
 assert.equal(detectPaperCorners(image(400,600,[0,0,399,599])),null)
})
test('invalid pixel buffer rejected',()=>{
 assert.equal(detectPaperCorners({width:400,height:600,data:[]}),null)
})

test('registration mark candidates on bright sheet are provisional',()=>{
 const w=400,h=600
 const photo=image(w,h,[30,30,369,569],180,245)
 for(const [cx,cy] of [[50,50],[350,50],[350,550],[50,550]]){
  for(let y=cy-6;y<=cy+6;y++)for(let x=cx-6;x<=cx+6;x++){
   const k=(y*w+x)*4
   photo.data[k]=photo.data[k+1]=photo.data[k+2]=5
  }
 }
 const result=detectPaperCorners(photo)
 assert.ok(result)
 assert.equal(result.requiresConfirmation,true)
 assert.equal(result.method,'registration-mark-candidates')
 for(let i=0;i<4;i++){
  const [x,y]=[[30.65,28.02],[369.35,28.02],[369.35,571.98],[30.65,571.98]][i]
  assert.ok(Math.abs(result.corners[i].x-x)<16)
  assert.ok(Math.abs(result.corners[i].y-y)<16)
 }
})
