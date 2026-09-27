'use client'
import {useMemo,useState} from 'react'

const qualityLabel=v=>({saglam:'Sağlam',iyi:'İyi',orta:'Orta',zayif:'Zayıf'}[v]||'Değerlendirilmedi')
const statusLabel=v=>({H:'Hasta',R:'Raporlu','İ':'İzinli',T:'Tatil',M:'Mazeretli',G:'Gelmedi',X:'Ders Vermedi'}[v]||v||'')
const fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'}):'—'
const juzText=r=>r?.juz_values?.length?r.juz_values.map(x=>x+'. Cüz').join(', '):r?.juz_no?r.juz_no+'. Cüz':'—'

export default function ParentProgress({data}){
 const program=data?.class?.program||'kap',student=data?.student||{},now=new Date()
 const academic=String(data?.institution?.academic_year||'').match(/(\d{4})\D+(\d{4})/)
 const current=now.toISOString().slice(0,7),[chosen,setChosen]=useState(current)
 const months=useMemo(()=>{const out=[];if(academic){const a=+academic[1],b=+academic[2];for(let m=9;m<=12;m++)out.push(a+'-'+String(m).padStart(2,'0'));for(let m=1;m<=8;m++)out.push(b+'-'+String(m).padStart(2,'0'))}else for(let i=0;i<12;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);out.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'))}return out},[data?.institution?.academic_year])
 const month=months.includes(chosen)?chosen:(months.includes(current)?current:months[0]),[y,m]=month.split('-').map(Number),days=new Date(y,m,0).getDate(),prefix=month+'-'
 const within=(r,key='lesson_date')=>String(r?.[key]||'').startsWith(prefix)
 const attendance=(data?.attendance||[]).filter(r=>within(r,'attendance_date'))
 const rows=program==='hafizlik'?(data?.hafizlik_records||[]).filter(within):program==='yuzune'?(data?.yuzune_progress||[]).filter(within):(data?.kap_records||[]).filter(within)
 const monthName=new Date(y,m-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'})
 const last=rows[0],absent=attendance.filter(x=>x.status!=='present').length
 const programTitle=program==='hafizlik'?'Hafızlık Eğitim Takibi':program==='yuzune'?'Yüzüne · Ders / Sûre / Dua Takibi':'Kur’an’ı Anlama (KAP) · Cüz Takibi'
 const detailTitle=r=>program==='yuzune'?(r.title||'Kur’an-ı Kerim'):program==='kap'?juzText(r):(r.work_value?'Cüz / Has: '+r.work_value:'Ders kaydı')
 const detailMeta=r=>{if(program==='yuzune')return r.result==='minus'?'Tekrar edilecek':qualityLabel(r.quality);if(program==='kap')return (r.has_no||student.kap_has_no?((r.has_no||student.kap_has_no)+'. Has'):'Has belirtilmedi')+(data?.kap_teacher?.full_name?' · '+data.kap_teacher.full_name:'');return [r.lesson_stage||'Hafızlık dersi',r.status_code?statusLabel(r.status_code):qualityLabel(r.quality)].filter(Boolean).join(' · ')}
 return <section className="parentSection parentProgress">
  <div className="parentProgressHead"><div><small className="parentEyebrow">E-GÖLKENT · VELİ BİLGİLENDİRME</small><h4>Aylık Eğitim Takibi</h4><p>{programTitle}</p></div><label className="parentMonthSelect"><span>Görüntülenecek Ay</span><select value={month} onChange={e=>setChosen(e.target.value)}>{months.map(x=><option key={x} value={x}>{new Date(+x.slice(0,4),+x.slice(5)-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</option>)}</select></label></div>
  <div className="progressSummary"><div><small>Dönem</small><b>{monthName}</b></div><div><small>Ders / Çalışma</small><b>{rows.length}</b></div><div><small>Devamsızlık / Mazeret</small><b>{absent}</b></div>{program==='yuzune'&&<div><small>Son Verilen Ders</small><b>{last?.title||'—'}</b></div>}{program==='kap'&&<><div><small>Son Dinletilen</small><b>{juzText(last)}</b></div><div><small>Mevcut Has</small><b>{student.kap_has_no?student.kap_has_no+'. Has':'—'}</b></div></>}{program==='hafizlik'&&<div><small>Son Cüz / Has</small><b>{last?.work_value||'—'}</b></div>}</div>
  {program==='hafizlik'&&<div className="parentHafSummary"><div><small>Kaçla Gidiyor</small><b>{student.hafizlik_pace||'—'}</b></div><div><small>Ham</small><b>{student.hafizlik_ham_pages??'—'}</b></div><div><small>Ham-Has</small><b>{student.hafizlik_ham_has_pages??'—'}</b></div><div><small>Has</small><b>{student.hafizlik_has_pages??'—'}</b></div></div>}
  <div className="monthStrip">{Array.from({length:days},(_,i)=>i+1).map(day=>{const date=prefix+String(day).padStart(2,'0'),r=rows.find(x=>x.lesson_date===date),a=attendance.find(x=>x.attendance_date===date),bad=a&&a.status!=='present';return <div key={day} title={r?detailTitle(r):bad?statusLabel(a.status):''} className={'monthDay'+(r?' hasLesson':'')+(bad?' absentDay':'')}><b>{day}</b><span>{r?'✓':bad?'!':'·'}</span></div>})}</div>
  <div className="parentYuzuneHistory"><div className="parentYuzuneTitle"><h4>{program==='hafizlik'?'Bu Ayın Hafızlık Dersleri':program==='yuzune'?'Bu Ay Verilen Ders / Sûre / Dualar':'Bu Ay Hocaya Dinletilen Cüzler'}</h4><span>{rows.length} kayıt</span></div>
   {!rows.length?<p className="parentEmpty">{monthName} döneminde kayıtlı eğitim çalışması bulunmuyor.</p>:<div className="parentYuzuneList">{rows.map((r,n)=><div className={'parentYuzuneRow '+(r.quality||'')} key={n}><div><b>{detailTitle(r)}</b><small>{fmt(r.lesson_date)} · {detailMeta(r)}</small>{r.note&&<small>Not: {r.note}</small>}</div>{program==='yuzune'?<span className={'parentResult '+r.result}>{r.result==='plus'?'✓':'↻'}</span>:<span className="parentResult plus">{r.status_code||'✓'}</span>}<strong>{r.status_code?statusLabel(r.status_code):program==='yuzune'?(r.result==='minus'?'Tekrar':qualityLabel(r.quality)):qualityLabel(r.quality)}</strong></div>)}</div>}
  </div>
 </section>
}
