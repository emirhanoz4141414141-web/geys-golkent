'use client'
import {useEffect,useMemo,useState} from 'react'

const emptyLegacy={first:'',last:'',birth:'',phone:'',date:'',program:'',reason:'other',detail:'',destination:''}
const reasonLabel=k=>({parent_request:'Veli Talebi',transfer:'Nakil',discipline:'Disiplin',health:'Sağlık',own_request:'Kendi İsteği',other:'Diğer'}[k]||k||'—')

export default function DepartedStudentsModule({supabase,students=[],classes=[],profile,permissions,onRefresh}){
 const [items,setItems]=useState([]),[archiveStudents,setArchiveStudents]=useState([]),[q,setQ]=useState('')
 const [restore,setRestore]=useState(null),[legacyOpen,setLegacyOpen]=useState(false),[legacy,setLegacy]=useState(emptyLegacy),[msg,setMsg]=useState('')
 const canCreate=profile?.role==='super_admin'||permissions?.can_create
 const canUpdate=profile?.role==='super_admin'||permissions?.can_update
 const load=async()=>{const [{data:i},{data:s}]=await Promise.all([supabase.from('student_departures').select('*').order('departure_date',{ascending:false}),supabase.from('students').select('*').in('student_status',['graduated','departed'])]);setItems(i||[]);setArchiveStudents(s||[])}
 useEffect(()=>{load()},[])
 const sm=useMemo(()=>Object.fromEntries([...students,...archiveStudents].map(s=>[s.id,s])),[students,archiveStudents])
 const rows=useMemo(()=>items.map(x=>({...x,student:sm[x.student_id]})).filter(x=>x.student).filter(x=>(x.student.first_name+' '+x.student.last_name).toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))),[items,sm,q])
 async function addLegacy(e){e.preventDefault();setMsg('');const {error}=await supabase.rpc('add_legacy_departed',{p_first:legacy.first,p_last:legacy.last,p_birth:legacy.birth||null,p_phone:legacy.phone||null,p_departure:legacy.date||null,p_program:legacy.program||null,p_reason:legacy.reason,p_detail:legacy.detail||null,p_destination:legacy.destination||null});if(error)return setMsg(error.message);setLegacy(emptyLegacy);setLegacyOpen(false);setMsg('Geçmiş ayrılan öğrenci arşive eklendi.');await load()}
 async function reactivate(){if(!restore?.student||!restore.class_id)return setMsg('Aktif sınıfı seçiniz.');const {error}=await supabase.rpc('reactivate_student',{p_student:restore.student.id,p_class:restore.class_id});if(error)return setMsg(error.message);setRestore(null);setMsg('Öğrenci yeniden aktif duruma alındı.');await load();if(onRefresh)await onRefresh()}
 const now=new Date().getFullYear()
 return <section className="graduatesPro">
  <div className="gradHero departureHero"><div><small>E-GÖLKENT · ÖĞRENCİ YAŞAM DÖNGÜSÜ</small><h2>Ayrılan Öğrenciler Arşivi</h2><p>Programını tamamlamadan kurumdan ayrılan öğrencilerin kurumsal kayıt ve takip alanı.</p></div></div>
  <div className="gradStats"><div><span>Toplam Ayrılan</span><b>{items.length}</b></div><div><span>Bu Yıl</span><b>{items.filter(x=>String(x.departure_date||'').startsWith(String(now))).length}</b></div><div><span>Nakil</span><b>{items.filter(x=>x.reason_category==='transfer').length}</b></div><div><span>Veli Talebi</span><b>{items.filter(x=>x.reason_category==='parent_request').length}</b></div></div>
  <div className="gradTools"><input placeholder="Ayrılan öğrenci ara..." value={q} onChange={e=>setQ(e.target.value)}/>{canCreate&&<button onClick={()=>setLegacyOpen(true)}>+ Geçmiş Ayrılan Ekle</button>}</div>
  <div className="tableWrap"><table><thead><tr><th>Öğrenci</th><th>Ayrılış Tarihi</th><th>Neden</th><th>Program</th><th>Gittiği Kurum</th><th>Açıklama</th><th>İşlem</th></tr></thead><tbody>
   {rows.map(x=><tr key={x.id}><td><b>{x.student.first_name} {x.student.last_name}</b></td><td>{x.departure_date||'—'}</td><td>{reasonLabel(x.reason_category)}</td><td>{x.last_program||'—'}</td><td>{x.destination_institution||'—'}</td><td>{x.reason_detail||'—'}</td><td>{canUpdate&&<button onClick={()=>setRestore({student:x.student,class_id:''})}>Aktife Geri Al</button>}</td></tr>)}
   {!rows.length&&<tr><td colSpan="7">Henüz ayrılan öğrenci kaydı bulunmuyor.</td></tr>}
  </tbody></table></div>
  {msg&&<div className="msg">{msg}</div>}
  {legacyOpen&&<LegacyDepartureForm legacy={legacy} setLegacy={setLegacy} onClose={()=>setLegacyOpen(false)} onSubmit={addLegacy}/>}
  {restore&&<RestoreModal restore={restore} setRestore={setRestore} classes={classes} onSubmit={reactivate}/>}
 </section>
}

function LegacyDepartureForm({legacy,setLegacy,onClose,onSubmit}){
 return <div className="debtModalBackdrop"><form className="debtModal gradForm" onSubmit={onSubmit}>
  <div className="debtModalHead"><div><small>ARŞİV KAYDI</small><h3>Geçmiş Ayrılan Öğrenci Ekle</h3><p>E-Gölkent öncesi ayrılan öğrenciler için.</p></div><button type="button" onClick={onClose}>✕</button></div>
  <div className="gradFormGrid">
   <input required placeholder="Adı" value={legacy.first} onChange={e=>setLegacy({...legacy,first:e.target.value})}/>
   <input required placeholder="Soyadı" value={legacy.last} onChange={e=>setLegacy({...legacy,last:e.target.value})}/>
   <label>Doğum Tarihi<input type="date" value={legacy.birth} onChange={e=>setLegacy({...legacy,birth:e.target.value})}/></label>
   <input placeholder="Şahsi telefon" value={legacy.phone} onChange={e=>setLegacy({...legacy,phone:e.target.value})}/>
   <label>Ayrılış Tarihi<input type="date" value={legacy.date} onChange={e=>setLegacy({...legacy,date:e.target.value})}/></label>
   <input placeholder="Program / Son Sınıf" value={legacy.program} onChange={e=>setLegacy({...legacy,program:e.target.value})}/>
   <label>Ayrılış Nedeni<select value={legacy.reason} onChange={e=>setLegacy({...legacy,reason:e.target.value})}><option value="parent_request">Veli Talebi</option><option value="transfer">Nakil</option><option value="discipline">Disiplin</option><option value="health">Sağlık</option><option value="own_request">Kendi İsteği</option><option value="other">Diğer</option></select></label>
   <input placeholder="Gittiği kurum" value={legacy.destination} onChange={e=>setLegacy({...legacy,destination:e.target.value})}/>
   <textarea placeholder="Ayrılış açıklaması" value={legacy.detail} onChange={e=>setLegacy({...legacy,detail:e.target.value})}/>
  </div>
  <div className="lifecycleWarn">Muhtemel mükerrer kayıtlar sunucu tarafında kontrol edilir. Bu kayıt aktif öğrenci listesine eklenmez.</div>
  <button className="primary">Arşive Kaydet</button>
 </form></div>
}
function RestoreModal({restore,setRestore,classes,onSubmit}){
 return <div className="debtModalBackdrop"><div className="debtModal gradForm">
  <div className="debtModalHead"><div><small>ÖĞRENCİ YAŞAM DÖNGÜSÜ</small><h3>Aktife Geri Al</h3><p>{restore.student.first_name} {restore.student.last_name}</p></div><button onClick={()=>setRestore(null)}>✕</button></div>
  <label>Aktif Sınıf<select value={restore.class_id} onChange={e=>setRestore({...restore,class_id:e.target.value})}><option value="">Sınıf seçiniz</option>{classes.map(x=><option key={x.id} value={x.id}>{x.code} — {x.name}</option>)}</select></label>
  <div className="lifecycleWarn">Ayrılış kaydı ve eski geçmiş silinmez. Öğrenci aynı kimlikle yeniden aktif hale gelir.</div>
  <button className="primary" onClick={onSubmit}>Aktife Al</button>
 </div></div>
}
