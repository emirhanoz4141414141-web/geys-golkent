import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPrintPages, PAPER, REGISTRATION_MARKS } from '../app/lib/opticalTemplate.js'
test('20 soruluk form tek sayfadır ve koordinatlar sabittir', () => {
 const pages = buildPrintPages(20)
 assert.equal(pages.length, 1)
 assert.equal(pages[0].rows[0].bubbles[0].x, 35)
 assert.equal(pages[0].rows[19].number, 20)
})
test('41 soruluk form ikinci sayfaya taşar, soru atlamaz', () => {
 const pages = buildPrintPages(41)
 assert.deepEqual(pages.map(p => p.rows.length), [40, 1])
 assert.deepEqual(pages.flatMap(p => p.rows.map(r => r.number)), Array.from({length:41},(_,i)=>i+1))
})
test('200 soru beş sayfaya sığar, her baloncuk kağıt içindedir', () => {
 const pages = buildPrintPages(200)
 assert.equal(pages.length, 5)
 for(const page of pages) for(const row of page.rows) for(const b of row.bubbles) {
  assert.ok(b.x > 12 && b.x < PAPER.width-12)
  assert.ok(b.y > 12 && b.y < PAPER.height-12)
 }
 assert.equal(REGISTRATION_MARKS.length,4)
})
test('geçersiz soru sayıları reddedilir',()=>{
 for(const n of [0,-1,201,1.5,NaN]) assert.throws(()=>buildPrintPages(n))
})
