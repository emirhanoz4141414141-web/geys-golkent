'use client'
import {useEffect,useMemo,useState} from 'react'
import {Bell,Plus,Trash2,CheckCircle2,Megaphone,RefreshCw} from 'lucide-react'

const blank={title:'',body:'',category:'announcement',version_label:'',audience:['all'],requires_ack:false,is_published:true}
const roleLabel={all:'Tüm Kullanıcılar',admin:'Yöneticiler',teacher:'Öğreticiler',staff:'Personel'}
const categoryLabel={announcement:'Duyuru',update:'Güncelleme',important:'Önemli Duyuru'}

export default function AnnouncementsModule({supabase,profile,institution,permissions,onUnreadChange}){
 const isManager=['admin','super_admin'].includes(profile?.role)
 const canCreate=profile?.role==='super_admin'||!!permissions?.can_create
 const canDelete=profile?.role==='super_admin'||!!permissions?.can_delete
 const [items,setItems]=useState([]),[reads,setReads]=useState([]),[allReads,setAllReads]=useState([]),[people,setPeople]=useState([]),[detail,setDetail]=useState(null),[form,setForm]=useState(blank),[showForm,setShowForm]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('')
 async function load(){
  const jobs=[
   supabase.from('announcements').select('*').order('published_at',{ascending:false}).limit(100),
   supabase.from('announcement_reads').select('announcement_id,user_id,read_at,acknowledged_at').eq('user_id',profile.id)
  ]
  if(isManager)jobs.push(supabase.from('announcement_reads').select('announcement_id,user_id,read_at,acknowledged_at'),supabase.from('profiles').select('id,full_name,email,role,active').eq('active',true))
  const results=await Promise.all(jobs),{data:a,error}=results[0],{data:r}=results[1]
  if(error)setMsg('Duyurular yüklenemedi: '+error.message)
  setItems(a||[]);setReads(r||[]);if(isManager){setAllReads(results[2]?.data||[]);setPeople(results[3]?.data||[])}
 }
 useEffect(()=>{if(profile?.id)load()},[profile?.id])
 const readMap=useMemo(()=>Object.fromEntries(reads.map(x=>[x.announcement_id,x])),[reads])
 const unread=items.filter(x=>x.is_published&&!readMap[x.id]).length
 const eligible=item=>people.filter(p=>(item.audience||['all']).includes('all')||(item.audience||[]).includes(p.role))
 const managerStats=item=>{const target=eligible(item),rr=allReads.filter(x=>x.announcement_id===item.id&&target.some(p=>p.id===x.user_id));return {target,read:rr,readCount:rr.length,ackCount:rr.filter(x=>x.acknowledged_at).length,unreadCount:Math.max(0,target.length-rr.length)}}
 useEffect(()=>{onUnreadChange?.(unread)},[unread,onUnreadChange])
 async function mark(item,ack=false){
  const row={announcement_id:item.id,user_id:profile.id,read_at:new Date().toISOString()}
  if(ack)row.acknowledged_at=new Date().toISOString()
  const {error}=await supabase.from('announcement_reads').upsert(row,{onConflict:'announcement_id,user_id'})
  if(error)return setMsg('İşlem kaydedilemedi: '+error.message)
  await load()
 }
 function toggleAudience(v){
  if(v==='all')return setForm(x=>({...x,audience:['all']}))
  setForm(x=>{let a=(x.audience||[]).filter(y=>y!=='all');a=a.includes(v)?a.filter(y=>y!==v):[...a,v];return {...x,audience:a.length?a:['all']}})
 }
 async function publish(e){
  e.preventDefault();if(!canCreate)return setMsg('Duyuru yayımlama yetkiniz bulunmuyor.')
  if(!form.title.trim()||!form.body.trim())return setMsg('Başlık ve açıklama zorunludur.')
  setBusy(true);setMsg('')
  const {error}=await supabase.from('announcements').insert({...form,title:form.title.trim(),body:form.body.trim(),version_label:form.version_label.trim()||null,institution_id:institution?.id||null,created_by:profile.id,published_at:new Date().toISOString()})
  setBusy(false);if(error)return setMsg('Duyuru yayımlanamadı: '+error.message)
  setForm(blank);setShowForm(false);setMsg('Duyuru başarıyla yayımlandı.');await load()
 }
 async function remove(id){
  if(!canDelete)return setMsg('Duyuru silme yetkiniz bulunmuyor.')
  if(!confirm('Bu duyuru silinsin mi?'))return
  const {error}=await supabase.from('announcements').delete().eq('id',id)
  if(error)return setMsg('Duyuru silinemedi: '+error.message)
  await load()
 }
 return <div className="annCenter">
  <section className="annHero">
   <div><span className="annEyebrow"><Bell size={15}/> E-GÖLKENT BİLGİLENDİRME MERKEZİ</span><h2>Duyurular & Güncellemeler</h2><p>Kurum içi bilgilendirmeler, sistem yenilikleri ve önemli değişiklikler tek yerde.</p></div>
   <div className="annHeroActions"><button className="secondary" onClick={load}><RefreshCw size={16}/> Yenile</button>{canCreate&&<button onClick={()=>setShowForm(v=>!v)}><Plus size={16}/> Yeni Duyuru</button>}</div>
  </section>
  {msg&&<div className="msg">{msg}</div>}
  {showForm&&canCreate&&<form className="panel annForm" onSubmit={publish}>
   <div className="panelHead"><div><h3>Yeni Duyuru / Güncelleme</h3><p>Yayımlanacak bilgilendirmenin kapsamını belirleyin.</p></div><Megaphone size={22}/></div>
   <div className="annFormGrid"><label><span>Tür</span><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="announcement">Duyuru</option><option value="update">Sistem Güncellemesi</option><option value="important">Önemli Duyuru</option></select></label><label><span>Sürüm / Etiket</span><input value={form.version_label} onChange={e=>setForm({...form,version_label:e.target.value})} placeholder="Örn. v1.1"/></label></div>
   <label><span>Başlık</span><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Duyuru başlığı"/></label>
   <label><span>Açıklama</span><textarea rows="6" value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Yapılan değişikliği veya duyuruyu açıklayın..."/></label>
   <div><span className="annFieldTitle">Hedef Kitle</span><div className="annAudience">{Object.entries(roleLabel).map(([k,v])=><button type="button" key={k} className={(form.audience||[]).includes(k)?'active':''} onClick={()=>toggleAudience(k)}>{v}</button>)}</div></div>
   <label className="annCheck"><input type="checkbox" checked={form.requires_ack} onChange={e=>setForm({...form,requires_ack:e.target.checked})}/><span>Kullanıcılardan “Okudum, bilgi edindim” onayı iste</span></label>
   <button disabled={busy}>{busy?'Yayımlanıyor...':'Duyuruyu Yayımla'}</button>
  </form>}
  <div className="annStats"><div><b>{items.length}</b><span>Toplam duyuru</span></div><div><b>{isManager?items.reduce((n,x)=>n+managerStats(x).unreadCount,0):unread}</b><span>{isManager?'Kurum genelinde okunmamış':'Okunmamış'}</span></div><div><b>{items.filter(x=>x.category==='update').length}</b><span>Sistem güncellemesi</span></div></div>
  <div className="annList">{items.length===0?<section className="panel annEmpty"><Bell size={28}/><b>Henüz yayımlanmış duyuru bulunmuyor.</b></section>:items.map(item=>{const rd=readMap[item.id];return <article className={'panel annCard '+(!rd?'unread':'')} key={item.id}>
   <div className="annCardTop"><div className="annTags"><span className={'annType '+item.category}>{categoryLabel[item.category]||'Duyuru'}</span>{item.version_label&&<span className="annVersion">{item.version_label}</span>}{!rd&&<span className="annNew">YENİ</span>}</div><time>{new Date(item.published_at).toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})}</time></div>
   <h3>{item.title}</h3><p className="annBody">{item.body}</p>
   <div className="annMeta"><span>Hedef: {(item.audience||['all']).map(x=>roleLabel[x]||x).join(', ')}</span>{item.requires_ack&&<span>Okundu onayı isteniyor</span>}</div>
   {isManager&&(()=>{const s=managerStats(item);return <div className="annManagerStats"><button onClick={()=>setDetail(detail===item.id?null:item.id)}><b>{s.target.length}</b><span>Hedef kullanıcı</span></button><button onClick={()=>setDetail(detail===item.id?null:item.id)}><b>{s.readCount}</b><span>Okudu</span></button><button onClick={()=>setDetail(detail===item.id?null:item.id)}><b>{s.ackCount}</b><span>Bilgi edindi</span></button><button className={s.unreadCount?'warn':''} onClick={()=>setDetail(detail===item.id?null:item.id)}><b>{s.unreadCount}</b><span>Okumadı</span></button></div>})()}
   {isManager&&detail===item.id&&(()=>{const s=managerStats(item),rm=Object.fromEntries(s.read.map(r=>[r.user_id,r]));return <div className="annReceiptList"><div className="annReceiptHead"><b>Kullanıcı Durumları</b><span>{s.target.length} hedef kullanıcı</span></div>{s.target.map(p=>{const r=rm[p.id];return <div className="annReceiptRow" key={p.id}><div><b>{p.full_name||p.email||'Kullanıcı'}</b><span>{roleLabel[p.role]||p.role}</span></div><div className={'annReceiptStatus '+(r?.acknowledged_at?'ack':r?'read':'pending')}>{r?.acknowledged_at?'Bilgi edindi':r?'Okudu':'Okumadı'}</div><time>{r?.acknowledged_at?new Date(r.acknowledged_at).toLocaleString('tr-TR'):r?.read_at?new Date(r.read_at).toLocaleString('tr-TR'):'—'}</time></div>})}</div>})()}
   <div className="annCardActions">{!rd&&<button className="secondary" onClick={()=>mark(item,false)}>Okundu İşaretle</button>}{item.requires_ack&&!rd?.acknowledged_at&&<button onClick={()=>mark(item,true)}><CheckCircle2 size={16}/> Okudum, Bilgi Edindim</button>}{rd?.acknowledged_at&&<span className="annAck"><CheckCircle2 size={16}/> Bilgi edinildi</span>}{canDelete&&<button className="danger" onClick={()=>remove(item.id)}><Trash2 size={15}/> Sil</button>}</div>
  </article>})}</div>
 </div>
}
