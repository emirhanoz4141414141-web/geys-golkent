'use client'
function esc(v){return '"'+String(v??'').replaceAll('"','""')+'"'}
export default function ReportExports({students,classes,lessons,attendance,from,to,classId}){
 const selected=students.filter(s=>!classId||s.class_id===classId)
 function download(name,rows){
  const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(esc).join(';')).join('\n')],{type:'text/csv;charset=utf-8'})
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)
 }
 function studentReport(){
  const rows=[['Öğrenci','Sınıf','Ders Kaydı','Sağlam','İyi','Orta','Zayıf','Geldi','Gelmedi','Mazeret/Hasta/Rapor/İzin']]
  selected.forEach(s=>{const l=lessons.filter(x=>x.student_id===s.id),a=attendance.filter(x=>x.student_id===s.id);rows.push([s.first_name+' '+s.last_name,classes.find(c=>c.id===s.class_id)?.code||'',l.length,l.filter(x=>x.quality==='saglam').length,l.filter(x=>x.quality==='iyi').length,l.filter(x=>x.quality==='orta').length,l.filter(x=>x.quality==='zayif').length,a.filter(x=>x.status==='present').length,a.filter(x=>x.status==='absent').length,a.filter(x=>['excused','sick','report','leave'].includes(x.status)).length])})
  download('GEYS-Ogrenci-Basari-'+from+'-'+to+'.csv',rows)
 }
 function attendanceReport(){
  const rows=[['Tarih','Öğrenci','Sınıf','Durum','Not']]
  attendance.forEach(a=>{const s=students.find(x=>x.id===a.student_id);rows.push([a.attendance_date,s?s.first_name+' '+s.last_name:'',classes.find(c=>c.id===a.class_id)?.code||'',a.status,a.note||''])})
  download('GEYS-Yoklama-'+from+'-'+to+'.csv',rows)
 }
 function qualityReport(){
  const rows=[['Tarih','Öğrenci','Sınıf','Program','Ders/Cüz','Aşama','Kalite','Durum','Not']]
  lessons.forEach(l=>{const s=students.find(x=>x.id===l.student_id);rows.push([l.lesson_date,s?s.first_name+' '+s.last_name:'',classes.find(c=>c.id===l.class_id)?.code||'',l.program,l.work_value||l.subject||'',l.lesson_stage||l.curriculum_stage||'',l.quality||'',l.status_code||'',l.note||''])})
  download('GEYS-Ders-Kalite-'+from+'-'+to+'.csv',rows)
 }
 return <section className="panel reportExportPanel"><div className="panelHead"><div><h3>Rapor Çıktıları</h3><p>Seçili tarih ve sınıf filtresine göre kurumsal rapor dosyaları.</p></div></div><div className="reportExportBtns"><button className="primary" onClick={studentReport}>Öğrenci Başarı Raporu</button><button className="ghost" onClick={qualityReport}>Ders / Ezber Kalite Raporu</button><button className="ghost" onClick={attendanceReport}>Yoklama Raporu</button><button className="ghost" onClick={()=>window.print()}>PDF / Yazdır</button></div></section>
}