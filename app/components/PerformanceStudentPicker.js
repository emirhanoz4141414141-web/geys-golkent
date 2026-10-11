'use client';
import {useMemo,useState} from 'react';

const programNames={hafizlik:'Hafızlık',yuzune:'Yüzüne',kap:'Kur’an’ı Anlama'};
const fold=value=>String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
export default function PerformanceStudentPicker({students=[],classes=[],value='',onChange}){
 const [program,setProgram]=useState('all');
 const [classId,setClassId]=useState('all');
 const [query,setQuery]=useState('');
 const classMap=useMemo(()=>new Map(classes.map(c=>[String(c.id),c])),[classes]);
 const availableClasses=useMemo(()=>classes.filter(c=>students.some(s=>String(s.class_id)===String(c.id))&&(program==='all'||c.program===program)).sort((a,b)=>String(a.name||a.code||'').localeCompare(String(b.name||b.code||''),'tr')),[classes,students,program]);
 const filtered=useMemo(()=>students.filter(s=>{const c=classMap.get(String(s.class_id));return (program==='all'||c?.program===program)&&(classId==='all'||String(s.class_id)===classId)&&fold((s.first_name||'')+' '+(s.last_name||'')).includes(fold(query.trim()))}).sort((a,b)=>((a.first_name||'')+' '+(a.last_name||'')).localeCompare((b.first_name||'')+' '+(b.last_name||''),'tr')),[students,classMap,program,classId,query]);
 const selected=students.find(s=>s.id===value);
 const selectedVisible=filtered.some(s=>s.id===value);
 return <div className="perfPicker">
  <div className="perfPickerFields">
   <label>Program / grup<select value={program} onChange={e=>{setProgram(e.target.value);setClassId('all');onChange('')}}><option value="all">Tüm programlar</option>{Object.entries(programNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
   <label>Sınıf<select value={classId} onChange={e=>{setClassId(e.target.value);onChange('')}}><option value="all">Tüm sınıflar</option>{availableClasses.map(c=><option key={c.id} value={String(c.id)}>{c.name||c.code}</option>)}</select></label>
   <label>İsimle öğrenci ara<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Öğrencinin adını veya soyadını yazın…"/></label>
   <label>Öğrenci<select value={selectedVisible?value:''} onChange={e=>onChange(e.target.value)}><option value="">Öğrenci seçiniz</option>{filtered.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></label>
  </div>
  <p className="perfPickerCount">{filtered.length} öğrenci listeleniyor{selected&&!selectedVisible?' · Önceki seçim filtre dışında kaldı':''}.</p>
 </div>;
}
