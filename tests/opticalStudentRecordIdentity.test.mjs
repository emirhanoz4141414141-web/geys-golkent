import test from 'node:test'
import assert from 'node:assert/strict'
import {compactStudentReference,buildCompactFormIdentity,code39Bars} from '../app/lib/opticalFormIdentity.js'
test('same record and exam produces stable printable reference',()=>{
 const args={examCode:'SINAV-20261114',studentId:'e0123456-1234-4123-8123-123456789abc',pageNumber:1}
 const a=buildCompactFormIdentity(args)
 assert.ok(a);assert.equal(a,buildCompactFormIdentity(args));assert.ok(code39Bars(a))
 assert.notEqual(a,buildCompactFormIdentity({...args,studentId:'different-student'}))
 assert.notEqual(a,buildCompactFormIdentity({...args,pageNumber:2}))
 assert.notEqual(a,buildCompactFormIdentity({...args,examCode:'OTHER'}))
 assert.ok(!a.includes(args.studentId))
})
test('missing record cannot be encoded',()=>{
 assert.equal(compactStudentReference(''),null)
 assert.equal(buildCompactFormIdentity({examCode:'EXAM',studentId:''}),null)
 assert.equal(buildCompactFormIdentity({examCode:'EXAM',studentId:'id',pageNumber:0}),null)
})
