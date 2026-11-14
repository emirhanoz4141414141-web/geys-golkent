import test from 'node:test'
import assert from 'node:assert/strict'
import {buildFormIdentity,code39Bars} from '../app/lib/opticalFormIdentity.js'
test('form identity separates student, exam and page',()=>{
 const a=buildFormIdentity({examCode:'TECVIT',studentNumber:'123',pageNumber:1})
 assert.ok(a);assert.notEqual(a,buildFormIdentity({examCode:'TECVIT',studentNumber:'124'}))
 assert.notEqual(a,buildFormIdentity({examCode:'TECVIT',studentNumber:'123',pageNumber:2}))
 assert.notEqual(a,buildFormIdentity({examCode:'TECVIT2',studentNumber:'123'}))
 assert.ok(code39Bars(a)?.bars.length>0)
})
test('invalid or missing identity cannot produce barcode',()=>{
 assert.equal(buildFormIdentity({examCode:'TECVIT',studentNumber:''}),null)
 assert.equal(buildFormIdentity({examCode:'T*',studentNumber:'12'}),null)
 assert.equal(buildFormIdentity({examCode:'T',studentNumber:'12',pageNumber:0}),null)
 assert.equal(code39Bars('HELLO*'),null)
 assert.equal(code39Bars(''),null)
 assert.equal(code39Bars('A'.repeat(31)),null)
})
