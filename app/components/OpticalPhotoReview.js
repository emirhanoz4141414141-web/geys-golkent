'use client'
import { useEffect, useRef, useState } from 'react'
import { computeHomography, mapHomography } from '../lib/opticalPerspective.js'
import { validatePaperCorners } from '../lib/opticalGeometry.js'
import { measurePhotoPage } from '../lib/opticalPhotoMeasure.js'

const PAPER=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]
const LABELS=['Sol üst','Sağ üst','Sağ alt','Sol alt']
const MAX_BYTES=12*1024*1024

/**
 * Kamera/fotoğraf inceleme prototipi. Yalnızca cihazda çalışır.
 * Köşeler öğretici tarafından seçilir; otomatik algılama ve puanlama yapmaz.
 */
export default function OpticalPhotoReview({ questionCount = 20 }) {
  const [url,setUrl]=useState('')
  const [dimensions,setDimensions]=useState(null)
  const [corners,setCorners]=useState([])
  const [error,setError]=useState('')
  const [reading,setReading]=useState(null)
  const [busy,setBusy]=useState(false)
  const imageRef=useRef(null)
  const urlRef=useRef('')
  useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[])
  function chooseFile(event) {
    const file=event.target.files?.[0]
    setError('');setCorners([]);setDimensions(null);setReading(null)
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
    setReading(null)
    setCorners(old=>[...old,{x,y}])
  }
  async function analyzePhoto() {
    if (!valid || !imageRef.current || busy) return
    setBusy(true);setReading(null);setError('')
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
    <p>Fotoğraf cihazınızdan dışarı gönderilmez. Bu ekran not vermez ve öğrenci kaydı değiştirmez.</p>
    <label>Fotoğraf seç veya telefon kamerasıyla çek
      <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={chooseFile} style={{display:'block',marginTop:8}}/>
    </label>
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
        <button type="button" onClick={analyzePhoto} disabled={!valid||busy||questionCount>40}>{busy?'İnceleniyor…':'Fotoğraftaki cevapları incele'}</button>
        <button type="button" onClick={()=>{setReading(null);setCorners(old=>old.slice(0,-1))}} disabled={!corners.length}>Son köşeyi geri al</button>
        <button type="button" onClick={()=>{setReading(null);setCorners([])}}>Köşeleri yeniden seç</button>
      </div>
      {questionCount>40&&<p role="alert">Çok sayfalı sınavların fotoğraf okuması henüz desteklenmiyor. Bu ekranda en fazla 40 soru incelenebilir.</p>}
      {reading&&<div role="status" style={{marginTop:16,padding:12,border:'1px solid #d1d5db',borderRadius:8}}>
        <strong>Geçici optik inceleme — kayıt yapılmadı</strong>
        <p>İşaretli: {reading.rows.filter(r=>r.status==='marked').length} · Boş: {reading.rows.filter(r=>r.status==='blank').length} · Kontrol gerekli: {reading.rows.filter(r=>r.status==='review').length}</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(95px,1fr))',gap:6}}>{reading.rows.map(r=><div key={r.number} style={{padding:7,border:'1px solid #e5e7eb',borderRadius:6}}>{r.number}. {r.status==='marked'?r.answer:r.status==='blank'?'Boş':'İncele'}</div>)}</div>
        <p style={{fontSize:12}}>Bu sonuçlar otomatik notlandırılmaz, kaydedilmez veya veliye gösterilmez. Gerçek baskı ve kamera kalibrasyonu yapılmamıştır.</p>
      </div>}
      {corners.length===4&&<p role="status">{valid?'Dört köşe matematiksel olarak eşleştirildi. Bu, optik okuma doğrulaması değildir.':'Köşeler geçersiz. Yeniden seçin.'}</p>}
    </div>}
  </section>
}
