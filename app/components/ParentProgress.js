'use client'

export default function ParentProgress({data}){
  const lessons=data?.lessons||[]
  const attendance=data?.attendance||[]
  const yuzune=data?.yuzune_progress||[]
  const hafizlik=data?.hafizlik_records||[]
  const program=data?.class?.program
  const last=lessons[0]
  const today=new Date()
  const year=today.getFullYear()
  const month=today.getMonth()
  const days=new Date(year,month+1,0).getDate()
  const prefix=year+'-'+String(month+1).padStart(2,'0')+'-'
  const title=program==='hafizlik'?'Hafızlık ezber ve cüz gelişimi':program==='yuzune'?'Yüzüne okuma ve hedef gelişimi':'Kur’an’ı Anlama ders gelişimi'
  return <section className="parentSection parentProgress">
    <div className="parentProgressHead"><div><h4>Aylık Eğitim Takibi</h4><p>{title}</p></div><span>{today.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</span></div>
    <div className="progressSummary">
      {program==='hafizlik'&&<><div><small>Son Ders / Cüz</small><b>{last?.work_value||'—'}</b></div><div><small>Aşama</small><b>{last?.lesson_stage==='ham'?'Ham':last?.lesson_stage==='has'?'Has':last?.lesson_stage==='tekrar'?'Tekrar':'—'}</b></div><div><small>Kalite</small><b className={'quality '+(last?.quality||'')}>{last?.quality||'—'}</b></div></>}
      {program==='yuzune'&&<><div><small>Son Hedef</small><b>{last?.curriculum_stage||last?.subject||'—'}</b></div><div><small>Sayfa</small><b>{last?.page_no||'—'}</b></div><div><small>Durum</small><b>{last?.completion_state||'—'}</b></div></>}
      {program!=='hafizlik'&&program!=='yuzune'&&<><div><small>Son Cüz</small><b>{last?.work_value||'—'}</b></div><div><small>Son Konu</small><b>{last?.subject||'—'}</b></div><div><small>Kalite</small><b className={'quality '+(last?.quality||'')}>{last?.quality||'—'}</b></div></>}
    </div>
    <div className="monthStrip">{Array.from({length:days},(_,i)=>i+1).map(day=>{const date=prefix+String(day).padStart(2,'0');const lesson=lessons.find(x=>x.lesson_date===date);const att=attendance.find(x=>x.attendance_date===date);const absent=att&&att.status!=='present';return <div key={day} className={'monthDay'+(lesson?' hasLesson':'')+(absent?' absentDay':'')}><b>{day}</b><span>{lesson?(lesson.status_code||'✓'):absent?'G':'·'}</span></div>})}</div>
    {program==='hafizlik'&&<div className="parentHafizlik"><div className="parentYuzuneTitle"><h4>Hafızlık Ders Takibi</h4><span>{hafizlik.length} ders kaydı</span></div><div className="parentHafSummary"><div><small>Kaçla Gidiyor</small><b>{student.hafizlik_pace||'—'}</b></div><div><small>Ham</small><b>{student.hafizlik_ham_pages??'—'}</b></div><div><small>Ham-Has</small><b>{student.hafizlik_ham_has_pages??'—'}</b></div><div><small>Has</small><b>{student.hafizlik_has_pages??'—'}</b></div></div>{hafizlik.length===0?<p className="parentEmpty">Henüz Hafızlık ders kaydı bulunmuyor.</p>:<div className="parentHafList">{hafizlik.map((r,n)=>{const label=r.quality==='saglam'?'Sağlam':r.quality==='iyi'?'İyi':r.quality==='orta'?'Orta':r.quality==='zayif'?'Zayıf':r.status_code==='H'?'Hasta':r.status_code==='R'?'Raporlu':r.status_code==='İ'?'İzinli':r.status_code==='T'?'Tatil':r.status_code==='M'?'Mazeret':r.status_code==='G'?'Gelmedi':r.status_code==='X'?'Ders Vermedi':'—';return <div className={'parentHafRow '+(r.quality||'')+' '+(r.status_code?'status-'+r.status_code:'')} key={n}><div><b>{r.work_value?('Cüz / Has: '+r.work_value):'Ders Durumu'}</b><small>{new Date(r.lesson_date+'T12:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})}</small></div><strong>{r.quality?({saglam:'S',iyi:'İ',orta:'O',zayif:'Z'}[r.quality]):r.status_code||'·'}</strong><span>{label}</span></div>})}</div>}</div>}
    {program==='yuzune'&&<div className="parentYuzuneHistory"><div className="parentYuzuneTitle"><h4>Yüzüne Ders Geçmişi</h4><span>{yuzune.length} ders kaydı</span></div>{yuzune.length===0?<p className="parentEmpty">Henüz Yüzüne ders kaydı bulunmuyor.</p>:<div className="parentYuzuneList">{yuzune.map((r,n)=><div className={'parentYuzuneRow '+(r.quality||'')} key={n}><div><b>{r.title}</b><small>{new Date(r.lesson_date+'T12:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})}</small></div><span className={'parentResult '+r.result}>{r.result==='plus'?'+':'−'}</span><strong>{r.result==='minus'?'Ders verilmedi / tekrar':r.quality==='saglam'?'Sağlam':r.quality==='iyi'?'İyi':r.quality==='orta'?'Orta':r.quality==='zayif'?'Zayıf':'Kalite girilmedi'}</strong></div>)}</div>}</div>}
  </section>
}
