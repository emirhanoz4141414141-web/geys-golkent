import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePaperCorners } from '../app/lib/opticalGeometry.js'
test('normal dört köşe kabul edilir',()=>{
  assert.equal(validatePaperCorners([{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]).valid,true)
})
test('çapraz seçilen köşeler reddedilir',()=>{
  assert.equal(validatePaperCorners([{x:0,y:0},{x:100,y:100},{x:100,y:0},{x:0,y:100}]).reason,'crossed_or_concave')
})
test('içe bükülen köşe reddedilir',()=>{
  assert.equal(validatePaperCorners([{x:0,y:0},{x:100,y:0},{x:20,y:20},{x:0,y:100}]).valid,false)
})
test('çok küçük alan reddedilir',()=>{
  assert.equal(validatePaperCorners([{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}]).reason,'too_small')
})
