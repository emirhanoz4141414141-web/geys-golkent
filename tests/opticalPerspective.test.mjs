import test from 'node:test'
import assert from 'node:assert/strict'
import { computeHomography, mapHomography, mapPaperToImage } from '../app/lib/opticalPerspective.js'

const square=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]
test('aynı kâğıtta merkez değişmez',()=>{
  const m=computeHomography(square,square)
  const p=mapHomography(m,{x:50,y:50})
  assert.ok(Math.abs(p.x-50)<1e-7)
  assert.ok(Math.abs(p.y-50)<1e-7)
})
test('ölçeklenmiş görüntüde koordinatlar doğru dönüşür',()=>{
  const target=[{x:10,y:20},{x:210,y:20},{x:210,y:220},{x:10,y:220}]
  const p=mapPaperToImage(square,target,{x:25,y:75})
  assert.ok(Math.abs(p.x-60)<1e-7)
  assert.ok(Math.abs(p.y-170)<1e-7)
})
test('yamuk kâğıtta dört köşe hedefe eşlenir',()=>{
  const target=[{x:20,y:10},{x:180,y:20},{x:160,y:200},{x:5,y:160}]
  const m=computeHomography(square,target)
  square.forEach((p,i)=>{
    const mapped=mapHomography(m,p)
    assert.ok(Math.abs(mapped.x-target[i].x)<1e-6)
    assert.ok(Math.abs(mapped.y-target[i].y)<1e-6)
  })
})
test('çakışan köşeler reddedilir',()=>{
  assert.throws(()=>computeHomography(square,[square[0],square[0],square[0],square[0]]))
})
test('eksik köşeler reddedilir',()=>{
  assert.throws(()=>computeHomography(square.slice(0,3),square))
})
