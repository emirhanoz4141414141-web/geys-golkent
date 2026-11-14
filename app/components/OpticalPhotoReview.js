'use client'
import { useEffect, useRef, useState } from 'react'
import { computeHomography, mapHomography } from '../lib/opticalPerspective.js'
import { validatePaperCorners } from '../lib/opticalGeometry.js'
import { measurePhotoPage } from '../lib/opticalPhotoMeasure.js'
import { gradeExam } from '../lib/examGrading.js'
import { detectPaperCorners } from '../lib/opticalAutoCorners.js'

const PAPER=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]
const LABELS=['Sol üst','Sağ üst','Sağ alt','Sol alt']
const MAX_BYTES=12*1024*1024
const REVIEW_REASONS={multiple_marks:'Birden fazla işaret',weak_mark:'Silik / kararsız işaret',ambiguous_mark:'Birbirine yakın işaretler'}

/**
 * Kamera/fotoğraf inceleme prototipi. Yalnızca cihazda çalışır.
 * Köşeler öğretici tarafından seçilir; otomatik algılama ve puanlama yapmaz.
 */
export default function OpticalPhotoReview({ questionCount = 20, examCode = '', answerKey = null, expectedStudentNumber = '', expectedFormIdentity = '' }) {
  const [url,setUrl]=useState('')
  const [dimensions,setDimensions]=useState(null)
  const [corners,setCorners]=useState([])
  const [error,setError]=useState('')
  const [reading,setReading]=useState(null)
  const [manualAnswers,setManualAnswers]=useState({})
  const [confirmedCode,setConfirmedCode]=useState('')
  const [confirmedPage,setConfirmedPage]=useState(false)
  const [confirmedStudentNumber,setConfirmedStudentNumber]=useState('')
  const [confirmedFormIdentity,setConfirmedFormIdentity]=useState('')
  const [busy,setBusy]=useState(false)
  const [autoCandidate,setAutoCandidate]=useState(false)
  useEffect(()=>{setReading(null);setManualAnswers({});setConfirmedCode('');setConfirmedPage(false);setConfirmedStudentNumber('');setConfirmedFormIdentity('')},[questionCount,examCode,answerKey?.join('|'),expectedStudentNumber,expectedFormIdentity])
  const imageRef=useRef(null)
  const urlRef=useRef('')
  useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[])
  function chooseFile(event) {
    const file=event.target.files?.[0]
    setError('');setCorners([]);setAutoCandidate(false);setDimensions(null);setReading(null);setManualAnswers({});setConfirmedCode('');setConfirmedPage(false);setConfirmedStudentNumber('');setConfirmedFormIdentity('')
    if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current=''}
    setUrl('')
    if(!file)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>MAX_BYTES){
      setError('Yalnızca 12 MB altındaki JPEG, PNG veya WebP fotoğrafları kabul edilir.')
      return
    }
    const next=URL.createObjectURL(file)
    urlRef.current=next
    setUrl(next)
  }
  function addCorner(event) {
    if(!dimensions||corners.length===4)return
    const rect=event.currentTarget.getBoundingClientRect()
    if(!rect.width||!rect.height)return
    const x=(event.clientX-rect.left)/rect.width*dimensions.width
    const y=(event.clientY-rect.top)/rect.height*dimensions.height
    setReading(null);setManualAnswers({});setAutoCandidate(false)
    setCorners(old=>[...old,{x,y}])
  }
  function findCorners() {
    const image=imageRef.current
    setReading(null);setManualAnswers({});setAutoCandidate(false);setError('')
    if(!image?.naturalWidth)return
    if(image.naturalWidth*image.naturalHeight>12000000){setError('Fotoğraf 12 megapikseli aşmamalıdır.');return}
    const canvas=document.createElement('canvas')
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
    const ctx=canvas.getContext('2d',{willReadFrequently:true})
    if(!ctx){setError('Fotoğraf açılamadı.');return}
    try {
      ctx.drawImage(image,0,0)
      const result=detectPaperCorners(ctx.getImageData(0,0,canvas.width,canvas.height))
      if(!result){setCorners([]);setError('Kâğıt sınırı yeterli güvenle bulunamadı. Dört köşeyi elle seçiniz.');return}
      setCorners(result.corners);setAutoCandidate(true)
    }catch{setCorners([]);setError('Otomatik algılama başarısız. Köşeleri elle seçiniz.')}
  }
  async function analyzePhoto() {
    if (!valid || autoCandidate || !imageRef.current || busy || !examCode || confirmedCode.trim().toUpperCase()!==examCode || !confirmedPage || (expectedStudentNumber && confirmedStudentNumber.trim()!==expectedStudentNumber) || (expectedFormIdentity && confirmedFormIdentity.trim().toUpperCase()!==expectedFormIdentity)) return
    setBusy(true);setReading(null);setManualAnswers({});setError('')
    try {
      const image=imageRef.current
      if(image.naturalWidth*image.naturalHeight>12000000) throw new Error('Fotoğraf çözünürlüğü 12 megapikseli aşmamalıdır.')
      const canvas=document.createElement('canvas')
      canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
      const ctx=canvas.getContext('2d',{willReadFrequently:true})
      if(!ctx)throw new Error('Fotoğraf pikselleri okunamadı.')
      ctx.drawImage(image,0,0)
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height)
      setReading(measurePhotoPage(pixels,corners,{questionCount,pageNumber:1}))
    } catch(e){setError(e?.message||'Fotoğraf analiz edilemedi.')} finally {setBusy(false)}
  }
  let provisionalScore=null
  if(reading && Array.isArray(answerKey) && answerKey.length===reading.rows.length){
    try {
      const answers=reading.rows.map(r=>r.status==='review'
        ? (manualAnswers[r.number]==='BLANK'?'':manualAnswers[r.number]==='INVALID'?'MULTI':manualAnswers[r.number]||'REVIEW')
        : r.answer)
      provisionalScore=gradeExam({answerKey,answers})
    } catch { provisionalScore=null }
  }
  let valid=false
  let preview=[]
  if(corners.length===4){
    try {
      if (!validatePaperCorners(corners).valid) throw new Error('Köşeler geometrik olarak geçersiz.')
      const matrix=computeHomography(PAPER,corners)
      preview=[{x:.5,y:.5},{x:.25,y:.25},{x:.75,y:.75}].map(p=>mapHomography(matrix,p))
      valid=true
    } catch {valid=false}
  }
  return <section style={{padding:18,border:'1px solid #d5dee8',borderRadius:14,background:'#fff',color:'#1f2937'}}>
    <h3>Optik Fotoğraf İnceleme · Deneme</h3>
    <p>Fotoğraf cihazınızdan dışarı gönderilmez. Bu ekran yalnızca geçici puan önizlemesi sunar ve öğrenci kaydı değiştirmez.</p>
    <p><strong>İncelenecek soru sayısı: {questionCount}</strong> · Yalnızca ilk optik sayfa (en fazla 40 soru)</p>
    <p><strong>Beklenen sınav kodu: {examCode || 'Tanımlanmadı'}</strong></p>
    {expectedFormIdentity&&<p><strong>Beklenen form kimliği: {expectedFormIdentity}</strong> · Barkod otomatik okunmaz; formun altındaki kimliği gözle karşılaştırınız.</p>}
    {expectedStudentNumber&&<p><strong>Beklenen öğrenci numarası: {expectedStudentNumber}</strong></p>}
    <label>Fotoğraftaki formun sınav kodunu okuyup yazınız <input aria-label="Formdaki sınav kodu" value={confirmedCode} onChange={e=>{setConfirmedCode(e.target.value);setReading(null);setManualAnswers({})}} autoComplete="off"/></label>
    <label style={{display:'block',marginTop:8}}><input type="checkbox" checked={confirmedPage} onChange={e=>{setConfirmedPage(e.target.checked);setReading(null);setManualAnswers({})}}/> Fotoğraftaki formun 1. sayfa olduğunu gözle doğruladım.</label>
    {expectedFormIdentity&&<label style={{display:'block',marginTop:8}}>Fotoğraftaki form kimliğini yazınız <input aria-label="Formdaki form kimliği" value={confirmedFormIdentity} onChange={e=>{setConfirmedFormIdentity(e.target.value);setReading(null);setManualAnswers({})}} autoComplete="off"/></label>}
    {expectedStudentNumber&&<label style={{display:'block',marginTop:8}}>Formdaki öğrenci numarasını okuyup yazınız <input aria-label="Formdaki öğrenci numarası" value={confirmedStudentNumber} onChange={e=>{setConfirmedStudentNumber(e.target.value);setReading(null);setManualAnswers({})}} autoComplete="off"/></label>}
    <p style={{fontSize:12}}>Kod, sayfa ve öğrenci numarası fotoğraftan otomatik okunmaz; bu kontrolü öğretici yapar. Kod eşleşmezse analiz kapalıdır.</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
      <label style={{flex:'1 1 210px'}}>Galeriden veya dosyalardan yükle
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} style={{display:'block',width:'100%',marginTop:8}}/>
      </label>
      <label style={{flex:'1 1 210px'}}>Kamera ile fotoğraf çek
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={chooseFile} style={{display:'block',width:'100%',marginTop:8}}/>
      </label>
    </div>
    {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
    {url&&<div style={{marginTop:16}}>
      <p>{corners.length<4?`Sıradaki köşe: ${LABELS[corners.length]} — fotoğrafın üzerine dokunun.`:'Dört köşe seçildi. Konumları kontrol edin.'}</p>
      <div onClick={addCorner} role="button" tabIndex={0} aria-label="Fotoğrafta köşe seçme alanı" onKeyDown={e=>{if(e.key==='Enter')setError('Köşe seçmek için fotoğrafa dokunun veya fare kullanın.')}} style={{position:'relative',display:'inline-block',maxWidth:'100%',cursor:corners.length<4?'crosshair':'default'}}>
        <img ref={imageRef} src={url} alt="Yalnızca cihazda açılan optik cevap kâğıdı" onLoad={e=>setDimensions({width:e.currentTarget.naturalWidth,height:e.currentTarget.naturalHeight})} onError={()=>setError('Fotoğraf açılamadı.')} style={{maxWidth:'100%',maxHeight:650,display:'block'}}/>
        {dimensions&&<svg viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
          {corners.length===4&&<polygon points={corners.map(p=>`${p.x},${p.y}`).join(' ')} fill="rgba(16,185,129,.12)" stroke="#059669" strokeWidth={Math.max(2,dimensions.width/300)}/>}
          {corners.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r={Math.max(7,dimensions.width/90)} fill="#f59e0b" stroke="white" strokeWidth="2"/><text x={p.x} y={p.y+5} textAnchor="middle" fill="#111827" fontWeight="bold" fontSize={Math.max(12,dimensions.width/65)}>{i+1}</text></g>)}
          {valid&&preview.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={Math.max(3,dimensions.width/180)} fill="#059669"/>)}
        </svg>}
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
    <button type="button" onClick={findCorners} disabled={!dimensions||busy}>Köşeleri otomatik bul (deneme)</button>
    {autoCandidate&&<button type="button" onClick={()=>setAutoCandidate(false)}>Gösterilen köşeleri gözle doğruladım</button>}
        <button type="button" onClick={analyzePhoto} disabled={!valid||autoCandidate||busy||questionCount>40||!examCode||confirmedCode.trim().toUpperCase()!==examCode||!confirmedPage||(expectedStudentNumber&&confirmedStudentNumber.trim()!==expectedStudentNumber)||(expectedFormIdentity&&confirmedFormIdentity.trim().toUpperCase()!==expectedFormIdentity)}>{busy?'İnceleniyor…':'Fotoğraftaki cevapları incele'}</button>
        <button type="button" onClick={()=>{setReading(null);setManualAnswers({});setAutoCandidate(false);setCorners(old=>old.slice(0,-1))}} disabled={!corners.length}>Son köşeyi geri al</button>
        <button type="button" onClick={()=>{setReading(null);setManualAnswers({});setAutoCandidate(false);setCorners([])}}>Köşeleri yeniden seç</button>
      </div>
      {autoCandidate&&<p role="status" style={{color:'#92400e'}}>Otomatik köşeler yalnızca tahmindir. Fotoğraftaki gerçek dört kâğıt köşesiyle karşılaştırın; doğruysa doğrulayın, değilse köşeleri yeniden seçin.</p>}
   {questionCount>40&&<p role="alert">Çok sayfalı sınavların fotoğraf okuması henüz desteklenmiyor. Bu ekranda en fazla 40 soru incelenebilir.</p>}
      {reading&&<div role="status" style={{marginTop:16,padding:12,border:'1px solid #d1d5db',borderRadius:8}}>
        <strong>Geçici optik inceleme — kayıt yapılmadı</strong>
        <p>İşaretli: {reading.rows.filter(r=>r.status==='marked').length} · Boş: {reading.rows.filter(r=>r.status==='blank').length} · Kontrol gerekli: {reading.rows.filter(r=>r.status==='review').length}</p>
        <p>Öğretici incelemesi: Şüpheli cevapları basılı kâğıttan kontrol edip geçici olarak düzeltebilirsiniz.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:6}}>{reading.rows.map(r=><div key={r.number} style={{padding:7,border:'1px solid #e5e7eb',borderRadius:6}}>
          <strong>{r.number}. {r.status==='marked'?r.answer:r.status==='blank'?'Boş':'İncele'}</strong>
          {r.status==='review'&&<><small style={{display:'block',color:'#b45309'}}>{REVIEW_REASONS[r.reason]||'Kontrol gerekli'}</small>
          <label style={{display:'block',marginTop:5,fontSize:12}}>Kâğıttan doğrulanan cevap
            <select aria-label={`${r.number}. soru manuel kontrol`} value={manualAnswers[r.number]??''} onChange={e=>setManualAnswers(old=>({...old,[r.number]:e.target.value}))} style={{display:'block',width:'100%'}}>
              <option value="">İncelenmedi</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="BLANK">Boş</option><option value="INVALID">Geçersiz / çoklu</option>
            </select>
          </label></>}
        </div>)}</div>
        {provisionalScore&&<div role="status" style={{marginTop:12,padding:10,border:'1px solid #d1d5db',borderRadius:8}}><strong>Geçici puan: {provisionalScore.score} / {provisionalScore.maximumScore}</strong><p>Doğru: {provisionalScore.correct} · Yanlış: {provisionalScore.wrong} · Boş: {provisionalScore.blank} · Kontrol gerekli: {provisionalScore.review}</p>{provisionalScore.requiresReview&&<p style={{color:'#92400e'}}>Bu puan kesin değildir; kontrol bekleyen veya geçersiz cevaplar vardır.</p>}</div>}
        {!provisionalScore&&<p role="status">Puan hesaplamak için Sorular sekmesinde sınav taslağını ve cevap anahtarını tamamlayınız.</p>}
        <p><strong>Bekleyen şüpheli cevap: {reading.rows.filter(r=>r.status==='review'&&!manualAnswers[r.number]).length}</strong> · Manuel incelenen: {reading.rows.filter(r=>r.status==='review'&&manualAnswers[r.number]).length}</p>
        {reading.rows.some(r=>r.status==='review')&&<p style={{color:'#92400e',fontWeight:600}}>Belirsiz işaretler öğretici tarafından kâğıt üzerinden kontrol edilmelidir. Bu ekrandaki sonuçlar kesinleştirilemez.</p>}
        <p style={{fontSize:12}}>Geçici puan öğrenci notlarına kaydedilmez veya veliye gösterilmez. Gerçek baskı ve kamera kalibrasyonu yapılmamıştır.</p>
      </div>}
      {corners.length===4&&<p role="status">{valid?'Dört köşe matematiksel olarak eşleştirildi. Bu, optik okuma doğrulaması değildir.':'Köşeler geçersiz. Yeniden seçin.'}</p>}
    </div>}
  </section>
}
