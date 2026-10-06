'use client'
import {useEffect,useRef,useState} from 'react'
import {Camera,CameraOff,ScanLine} from 'lucide-react'

export default function LibraryScanner({onScan,label='Kamera ile Oku'}){
 const [open,setOpen]=useState(false),[error,setError]=useState('')
 const videoRef=useRef(null),streamRef=useRef(null),timerRef=useRef(null),detectorRef=useRef(null)
 function stop(){
  if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null}
  if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null}
  detectorRef.current=null;setOpen(false)
 }
 useEffect(()=>()=>{if(timerRef.current)clearInterval(timerRef.current);if(streamRef.current)streamRef.current.getTracks().forEach(t=>t.stop())},[])
 async function start(){
  setError('')
  if(typeof window==='undefined'||!navigator.mediaDevices?.getUserMedia){setError('Bu cihazda kamera erişimi desteklenmiyor. Manuel barkod girişi kullanılabilir.');return}
  if(!window.BarcodeDetector){setError('Bu tarayıcı kamera ile barkod/QR okumayı desteklemiyor. Manuel giriş kullanılabilir.');return}
  try{
   const formats=await window.BarcodeDetector.getSupportedFormats()
   const wanted=['qr_code','code_128','ean_13','ean_8','upc_a','upc_e'].filter(x=>formats.includes(x))
   detectorRef.current=new window.BarcodeDetector(wanted.length?{formats:wanted}:undefined)
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})
   streamRef.current=stream;setOpen(true)
   setTimeout(()=>{if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play().catch(()=>{})}},0)
   let busy=false
   timerRef.current=setInterval(async()=>{
    if(busy||!videoRef.current||videoRef.current.readyState<2||!detectorRef.current)return
    busy=true
    try{
     const hits=await detectorRef.current.detect(videoRef.current)
     const value=hits?.[0]?.rawValue?.trim()
     if(value){stop();onScan?.(value)}
    }catch{}finally{busy=false}
   },500)
  }catch(e){
   stop()
   setError(e?.name==='NotAllowedError'?'Kamera izni verilmedi. Tarayıcı ayarlarından izin verebilir veya manuel giriş kullanabilirsiniz.':'Kamera başlatılamadı. Manuel barkod girişi kullanılabilir.')
  }
 }
 return <div className="libraryScanner">
  <button type="button" className="libraryScanBtn" onClick={open?stop:start}>{open?<CameraOff size={15}/>:<Camera size={15}/>} {open?'Kamerayı Kapat':label}</button>
  {open&&<div className="libraryCameraPanel"><video ref={videoRef} playsInline muted/><div className="libraryCameraGuide"><ScanLine size={22}/><span>Barkodu veya QR kodu çerçeveye hizalayın</span></div></div>}
  {error&&<small className="libraryScanError">{error}</small>}
 </div>
}
