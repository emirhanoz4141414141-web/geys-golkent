'use client'
import { useEffect, useRef, useState } from 'react'
import { computeHomography, mapHomography } from '../lib/opticalPerspective.js'

const PAPER=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]
const LABELS=['Sol üst','Sağ üst','Sağ alt','Sol alt']
const MAX_BYTES=12*1024*1024

/**
 * Kamera/fotoğraf inceleme prototipi. Yalnızca cihazda çalışır.
 * Köşeler öğretici tarafından seçilir; otomatik algılama ve puanlama yapmaz.
 */
export default function OpticalPhotoReview() {
  const [url,setUrl]=useState('')
  const [dimensions,setDimensions]=useState(null)
  const [corners,setCorners]=useState([])
  const [error,setError]=useState('')
  const imageRef=useRef(null)
  const urlRef=useRef('')
  useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[])
  function chooseFile(event) {
    const file=event.target.files?.[0]
    setError('');setCorners([]);setDimensions(null)
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
    setCorners(old=>[...old,{x,y}])
  }
  let valid=false
  let preview=[]
  if(corners.length===4){
    try {
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
        <button type="button" onClick={()=>setCorners(old=>old.slice(0,-1))} disabled={!corners.length}>Son köşeyi geri al</button>
        <button type="button" onClick={()=>setCorners([])}>Köşeleri yeniden seç</button>
      </div>
      {corners.length===4&&<p role="status">{valid?'Dört köşe matematiksel olarak eşleştirildi. Bu, optik okuma doğrulaması değildir.':'Köşeler geçersiz. Yeniden seçin.'}</p>}
    </div>}
  </section>
}
