'use client'
import { useEffect, useRef, useState } from 'react'
import { computeHomography, mapHomography } from '../lib/opticalPerspective.js'
import { validatePaperCorners } from '../lib/opticalGeometry.js'
import { measurePhotoPage } from '../lib/opticalPhotoMeasure.js'
import { gradeExam } from '../lib/examGrading.js'
import { detectPaperCorners } from '../lib/opticalAutoCorners.js'
import { buildCompactFormIdentity } from '../lib/opticalFormIdentity.js'
import { buildPrintPages } from '../lib/opticalTemplate.js'

const PAPER=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]
const LABELS=['Sol üst','Sağ üst','Sağ alt','Sol alt']
const MAX_BYTES=12*1024*1024
function validCornersForSave(corners){return corners.length===4&&validatePaperCorners(corners).valid}
const REVIEW_REASONS={multiple_marks:'Birden fazla işaret',weak_mark:'Silik / kararsız işaret',ambiguous_mark:'Birbirine yakın işaretler'}

/**
 * Kamera/fotoğraf inceleme prototipi. Yalnızca cihazda çalışır.
 * Köşeler öğretici tarafından seçilir; otomatik algılama ve puanlama yapmaz.
 */
export default function OpticalPhotoReview({ questionCount = 20, examCode = '', answerKey = null, expectedStudentNumber = '', expectedFormIdentity = '', studentCandidates = [], supabase = null, savedExamId = '' }) {
  const [pageNumber,setPageNumber]=useState(1)
  const [collectedPages,setCollectedPages]=useState({})
  const [collectionMessage,setCollectionMessage]=useState('')
  const pages=buildPrintPages(questionCount)
  const pageRows=pages[pageNumber-1]?.rows||[]
  const pageAnswerKey=Array.isArray(answerKey)?pageRows.map(r=>answerKey[r.number-1]):null
  const [batchFiles,setBatchFiles]=useState([])
  const [batchIndex,setBatchIndex]=useState(-1)
  const [batchMessage,setBatchMessage]=useState('')
  const [batchStatuses,setBatchStatuses]=useState({})
  const [batchIdentities,setBatchIdentities]=useState({})
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
  const [barcodeBusy,setBarcodeBusy]=useState(false)
  const [barcodeMessage,setBarcodeMessage]=useState('')
  const [matchedStudent,setMatchedStudent]=useState(null)
  const [saveBusy,setSaveBusy]=useState(false)
  const [saveMessage,setSaveMessage]=useState('')
  const [reviewConfirmed,setReviewConfirmed]=useState(false)
  const [autoCandidate,setAutoCandidate]=useState(false)
  useEffect(()=>{setReading(null);setManualAnswers({});setConfirmedCode('');setConfirmedPage(false);setConfirmedStudentNumber('');setConfirmedFormIdentity('');setMatchedStudent(null);setCollectedPages({});setCollectionMessage('');setReviewConfirmed(false);setSaveMessage('')},[questionCount,examCode,answerKey?.join('|'),expectedStudentNumber,expectedFormIdentity])
  const imageRef=useRef(null)
  const urlRef=useRef('')
  useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[])
  function chooseFile(event) {
    setBatchFiles([]);setBatchIndex(-1);setBatchMessage('');setBatchStatuses({});setBatchIdentities({})
    const file=event.target.files?.[0]
    setError('');setCorners([]);setAutoCandidate(false);setDimensions(null);setReading(null);setManualAnswers({});setConfirmedCode('');setConfirmedPage(false);setConfirmedStudentNumber('');setConfirmedFormIdentity('');setBarcodeMessage('');setMatchedStudent(null);setReviewConfirmed(false);setSaveMessage('')
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
  function loadQueuedFile(index,files=batchFiles){
    if(index<0||index>=files.length)return
    const file=files[index]
    setError('');setCorners([]);setAutoCandidate(false);setDimensions(null);setReading(null);
    setManualAnswers({});setConfirmedCode('');setConfirmedPage(false);setConfirmedStudentNumber('');
    setConfirmedFormIdentity('');setBarcodeMessage('');setMatchedStudent(null);
    setReviewConfirmed(false);setSaveMessage('')
    if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current=''}
    const next=URL.createObjectURL(file)
    urlRef.current=next;setUrl(next);setBatchIndex(index)
    setBatchMessage((index+1)+'/'+files.length+' fotoğraf açıldı. Öğrenci, sayfa ve cevapları doğrulayınız.')
  }
  function chooseBatchFiles(event){
    const files=Array.from(event.target.files||[])
    event.target.value=''
    if(!files.length)return
    if(files.length>250){setBatchMessage('Bir seferde en fazla 250 fotoğraf seçiniz.');return}
    const invalid=files.find(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>MAX_BYTES)
    if(invalid){setBatchMessage('Dosyaların tamamı 12 MB altında JPEG, PNG veya WebP olmalıdır.');return}
    setBatchFiles(files);setBatchIndex(-1);setBatchStatuses({});setBatchIdentities({})
    loadQueuedFile(0,files)
  }
  function markBatchStatus(status){
    if(batchIndex<0||!batchFiles[batchIndex])return
    setBatchStatuses(old=>old[batchIndex]==='saved'&&status!=='saved'?old:{...old,[batchIndex]:status})
  }
  const batchCounts={
    waiting:batchFiles.filter((_,i)=>!batchStatuses[i]).length,
    reviewed:batchFiles.filter((_,i)=>batchStatuses[i]==='reviewed').length,
    needs_review:batchFiles.filter((_,i)=>batchStatuses[i]==='needs_review').length,
    saved:batchFiles.filter((_,i)=>batchStatuses[i]==='saved').length,
    error:batchFiles.filter((_,i)=>batchStatuses[i]==='error').length
  }
  async function scanBarcode(){
    const image=imageRef.current
    setBarcodeMessage('')
    if(!image?.naturalWidth){setBarcodeMessage('Önce fotoğraf yükleyiniz.');return}
    if(typeof window.BarcodeDetector!=='function'){setBarcodeMessage('Bu tarayıcı Code 39 barkod okumayı desteklemiyor. Form kimliğini elle giriniz.');return}
    setBarcodeBusy(true)
    try{
      const supported=await window.BarcodeDetector.getSupportedFormats()
      if(!supported.includes('code_39'))throw new Error('Bu cihazda Code 39 barkod okuyucu desteklenmiyor.')
      const detector=new window.BarcodeDetector({formats:['code_39']})
      const results=await detector.detect(image)
      const values=[...new Set(results.map(x=>String(x.rawValue||'').trim().toUpperCase()).filter(Boolean))]
      if(values.length!==1)throw new Error(values.length?'Birden fazla barkod algılandı; formu kontrol ediniz.':'Barkod algılanamadı. Daha net fotoğraf çekiniz veya elle giriniz.')
      const candidates=studentCandidates.map(student=>({
        student,identity:buildCompactFormIdentity({examCode,studentId:String(student.id),pageNumber})
      })).filter(x=>x.identity===values[0])
      if(candidates.length!==1)throw new Error(candidates.length?'Form kimliği birden fazla öğrenciyle eşleşti. Otomatik eşleştirme güvenli değil.':'Barkod bu sınavın kayıtlı öğrencileriyle eşleşmedi.')
      if(pageNumber===1 && expectedFormIdentity && values[0]!==expectedFormIdentity)throw new Error('Barkod seçili öğrenciyle eşleşmiyor. Seçimi kontrol ediniz.')
      const duplicateIndex=Object.entries(batchIdentities).find(([index,identity])=>Number(index)!==batchIndex&&identity===values[0])
      if(duplicateIndex)throw new Error('Aynı form kimliği kuyrukta '+(Number(duplicateIndex[0])+1)+'. fotoğrafta zaten eşleştirildi. Mükerrer form kontrolü gereklidir.')
      if(savedExamId&&supabase){
        const {data:existing,error:lookupError}=await supabase.from('optical_exam_results')
          .select('id,status').eq('exam_id',savedExamId).eq('student_id',candidates[0].student.id).limit(1)
        if(lookupError)throw new Error('Mevcut öğrenci sonucu kontrol edilemedi: '+lookupError.message)
        if(existing?.length)throw new Error('Bu öğrenci için sınav sonucu zaten kayıtlı ('+(existing[0].status==='approved'?'onaylı':'inceleme bekliyor')+'). Yeni form işlenmedi.')
      }
      if(batchIndex>=0)setBatchIdentities(old=>({...old,[batchIndex]:values[0]}))
      setMatchedStudent(candidates[0].student)
      setConfirmedFormIdentity(values[0])
      setConfirmedCode(examCode)
      setConfirmedPage(true)
      setBarcodeMessage('Barkod öğrenci ve sınav formuyla eşleşti. Kâğıdın sayfa ve köşe konumlarını ayrıca kontrol ediniz.')
    }catch(e){setBarcodeMessage(e?.message||'Barkod okunamadı. Elle doğrulayınız.');markBatchStatus('needs_review')}
    finally{setBarcodeBusy(false)}
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
    if (!valid || autoCandidate || !imageRef.current || busy || !examCode || confirmedCode.trim().toUpperCase()!==examCode || !confirmedPage || (expectedStudentNumber && confirmedStudentNumber.trim()!==expectedStudentNumber) || (!verifiedFormIdentity || confirmedFormIdentity.trim().toUpperCase()!==verifiedFormIdentity)) return
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
      const measured=measurePhotoPage(pixels,corners,{questionCount,pageNumber})
      setReading(measured)
      if(batchIndex>=0)markBatchStatus(measured.requiresReview?'needs_review':'reviewed')
    } catch(e){setError(e?.message||'Fotoğraf analiz edilemedi.');markBatchStatus('error')} finally {setBusy(false)}
  }
  const verifiedFormIdentity=(pageNumber===1?expectedFormIdentity:'') || (matchedStudent ? buildCompactFormIdentity({examCode,studentId:String(matchedStudent.id),pageNumber}) : '')
  let provisionalScore=null
  if(reading && Array.isArray(pageAnswerKey) && pageAnswerKey.length===reading.rows.length){
    try {
      const answers=reading.rows.map(r=>r.status==='review'
        ? (manualAnswers[r.number]==='BLANK'?'':manualAnswers[r.number]==='INVALID'?'MULTI':manualAnswers[r.number]||'REVIEW')
        : r.answer)
      provisionalScore=gradeExam({answerKey:pageAnswerKey,answers})
    } catch { provisionalScore=null }
  }
  const finalAnswers=reading?.rows.map(r=>r.status==='review'
    ? (manualAnswers[r.number]==='BLANK'?'':manualAnswers[r.number]==='INVALID'?'MULTI':manualAnswers[r.number]||'REVIEW')
    : (r.answer||''))||[]
  const pendingReviews=finalAnswers.filter(x=>x==='REVIEW').length
  const identifiedStudent=matchedStudent

  const collectedList=Object.values(collectedPages)
  const collectionStudentId=collectedList[0]?.studentId||''
  const collectionComplete=pages.length>1&&pages.every(p=>Boolean(collectedPages[p.pageNumber]))
  const combinedAnswers=collectionComplete?pages.flatMap(p=>collectedPages[p.pageNumber].answers):[]
  let combinedScore=null
  if(collectionComplete&&Array.isArray(answerKey)&&answerKey.length===combinedAnswers.length){
    try{combinedScore=gradeExam({answerKey,answers:combinedAnswers})}catch{}
  }
  function collectCurrentPage(){
    setCollectionMessage('')
    if(!reading||!provisionalScore||!identifiedStudent?.id||!confirmedPage||
      !verifiedFormIdentity||confirmedFormIdentity.trim().toUpperCase()!==verifiedFormIdentity||
      confirmedCode.trim().toUpperCase()!==examCode||autoCandidate||!validCornersForSave(corners)||
      pendingReviews!==0||provisionalScore.review!==0||
      reading.pageNumber!==pageNumber||reading.rows.length!==pageRows.length){
      setCollectionMessage('Sayfa eklenemedi. Barkod, kâğıt köşeleri ve tüm işaretlerin kontrolünü tamamlayınız.');return
    }
    if(collectionStudentId&&collectionStudentId!==String(identifiedStudent.id)){
      setCollectionMessage('Bu sayfa başka bir öğrenciye ait. Önce mevcut sayfa grubunu temizleyiniz.');return
    }
    if(collectedPages[pageNumber]){
      setCollectionMessage('Bu sayfa zaten eklendi. Önce sayfayı gruptan kaldırınız.');return
    }
    setCollectedPages(old=>({...old,[pageNumber]:{
      pageNumber,studentId:String(identifiedStudent.id),
      studentName:[identifiedStudent.first_name,identifiedStudent.last_name].filter(Boolean).join(' '),
      answers:[...finalAnswers],formIdentity:verifiedFormIdentity,batchIndex
    }}))
    setCollectionMessage(pageNumber+'. sayfa inceleme grubuna eklendi.')
    markBatchStatus('reviewed')
  }
  function changePage(next){
    setPageNumber(next);setReading(null);setManualAnswers({});setConfirmedCode('');setConfirmedPage(false);
    setConfirmedFormIdentity('');setMatchedStudent(null);setCorners([]);setAutoCandidate(false);
    setReviewConfirmed(false);setSaveMessage('');setCollectionMessage('')
  }

  const saveReady=Boolean(pageNumber===1&&pages.length===1&&savedExamId&&supabase&&identifiedStudent?.id&&reading&&provisionalScore&&
    pendingReviews===0&&provisionalScore.review===0&&reviewConfirmed&&
    verifiedFormIdentity&&confirmedFormIdentity.trim().toUpperCase()===verifiedFormIdentity&&
    confirmedCode.trim().toUpperCase()===examCode&&confirmedPage&&
    !autoCandidate&&validCornersForSave(corners))
  const multiSaveReady=Boolean(savedExamId&&supabase&&collectionComplete&&combinedScore&&
    combinedScore.review===0&&reviewConfirmed&&collectionStudentId&&
    combinedAnswers.length===questionCount&&
    pages.every(p=>collectedPages[p.pageNumber]?.formIdentity===
      buildCompactFormIdentity({examCode,studentId:collectionStudentId,pageNumber:p.pageNumber})))
  async function saveMultiPageResult(){
    if(!multiSaveReady||saveBusy)return
    setSaveBusy(true);setSaveMessage('')
    try{
      const {data:exam,error:examError}=await supabase.from('optical_exams')
        .select('id,exam_code,questions').eq('id',savedExamId).single()
      if(examError||!exam||exam.exam_code!==examCode||
        exam.questions.length!==questionCount||
        exam.questions.some((q,i)=>q.correctAnswer!==answerKey?.[i]))
        throw new Error('Kayıtlı sınav veya cevap anahtarı değişmiş. Sonuç kaydedilmedi.')
      const {data:existing,error:existingError}=await supabase.from('optical_exam_results')
        .select('id').eq('exam_id',savedExamId).eq('student_id',collectionStudentId).limit(1)
      if(existingError)throw existingError
      if(existing?.length)throw new Error('Bu öğrencinin sınav sonucu zaten kayıtlı. Üzerine yazılmadı.')
      const {error:insertError}=await supabase.from('optical_exam_results').insert({
        exam_id:savedExamId,student_id:collectionStudentId,page_count:pages.length,
        answers:combinedAnswers,correct_count:combinedScore.correct,
        wrong_count:combinedScore.wrong,blank_count:combinedScore.blank,
        review_count:combinedScore.review,score:combinedScore.score,status:'pending_review'
      })
      if(insertError)throw insertError
      setSaveMessage('Tüm sayfaların sonucu yönetici incelemesi bekleyen taslak olarak kaydedildi.')
      setBatchStatuses(old=>{
        const next={...old}
        for(const page of Object.values(collectedPages))if(Number.isInteger(page.batchIndex)&&page.batchIndex>=0)next[page.batchIndex]='saved'
        return next
      })
      setReviewConfirmed(false);setCollectedPages({})
    }catch(e){setSaveMessage('Çok sayfalı sonuç kaydedilemedi: '+(e?.message||'Bilinmeyen hata'))}
    finally{setSaveBusy(false)}
  }
  async function saveReviewedResult(){
    if(!saveReady||saveBusy)return
    setSaveBusy(true);setSaveMessage('')
    try{
      const {data:exam,error:examError}=await supabase.from('optical_exams')
        .select('id,exam_code,questions').eq('id',savedExamId).single()
      if(examError||!exam||exam.exam_code!==examCode||
         exam.questions.length!==questionCount||
         exam.questions.some((q,i)=>q.correctAnswer!==answerKey?.[i]))
        throw new Error('Kayıtlı sınav veya cevap anahtarı değişmiş. Sonuç kaydedilmedi.')
      const {data:existing,error:existingError}=await supabase.from('optical_exam_results')
        .select('id').eq('exam_id',savedExamId).eq('student_id',identifiedStudent.id).limit(1)
      if(existingError)throw existingError
      if(existing?.length)throw new Error('Bu öğrenci için sınav sonucu zaten var. Üzerine yazılmadı.')
      const payload={exam_id:savedExamId,student_id:identifiedStudent.id,page_count:1,
        answers:finalAnswers,correct_count:provisionalScore.correct,
        wrong_count:provisionalScore.wrong,blank_count:provisionalScore.blank,
        review_count:provisionalScore.review,score:provisionalScore.score,
        status:'pending_review'}
      const {error:insertError}=await supabase.from('optical_exam_results').insert(payload)
      if(insertError)throw insertError
      setSaveMessage('Sonuç yönetici incelemesi bekleyen taslak olarak kaydedildi. Kesin not veya veli sonucu değildir.')
      markBatchStatus('saved')
      setReviewConfirmed(false)
    }catch(e){setSaveMessage('Sonuç kaydedilemedi: '+(e?.message||'Bilinmeyen hata'))}
    finally{setSaveBusy(false)}
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
    <p><strong>Toplam soru: {questionCount}</strong> · {pages.length} sayfa · Seçili sayfa: {pageNumber} ({pageRows[0]?.number}–{pageRows[pageRows.length-1]?.number}. sorular)</p>
    <label>Okunacak sayfa <select aria-label="Optik sayfa numarası" value={pageNumber} onChange={e=>changePage(Number(e.target.value))}>{pages.map(p=><option key={p.pageNumber} value={p.pageNumber}>{p.pageNumber}. sayfa</option>)}</select></label>
    <p><strong>Beklenen sınav kodu: {examCode || 'Tanımlanmadı'}</strong></p>
    {pageNumber===1&&expectedFormIdentity&&<p><strong>Beklenen form kimliği: {expectedFormIdentity}</strong></p>}
    {matchedStudent&&<p role="status"><strong>Barkodla eşleşen öğrenci: {[matchedStudent.first_name,matchedStudent.last_name].filter(Boolean).join(' ')}</strong> · Sınav: {examCode}</p>}
    {expectedStudentNumber&&<p><strong>Beklenen öğrenci numarası: {expectedStudentNumber}</strong></p>}
    <label>Fotoğraftaki formun sınav kodunu okuyup yazınız <input aria-label="Formdaki sınav kodu" value={confirmedCode} onChange={e=>{setConfirmedCode(e.target.value);setReading(null);setManualAnswers({})}} autoComplete="off"/></label>
    <label style={{display:'block',marginTop:8}}><input type="checkbox" checked={confirmedPage} onChange={e=>{setConfirmedPage(e.target.checked);setReading(null);setManualAnswers({})}}/> Fotoğraftaki formun {pageNumber}. sayfa olduğunu gözle doğruladım.</label>
    {verifiedFormIdentity&&<label style={{display:'block',marginTop:8}}>Fotoğraftaki form kimliğini yazınız <input aria-label="Formdaki form kimliği" value={confirmedFormIdentity} onChange={e=>{setConfirmedFormIdentity(e.target.value);setReading(null);setManualAnswers({})}} autoComplete="off"/></label>}
    {expectedStudentNumber&&<label style={{display:'block',marginTop:8}}>Formdaki öğrenci numarasını okuyup yazınız <input aria-label="Formdaki öğrenci numarası" value={confirmedStudentNumber} onChange={e=>{setConfirmedStudentNumber(e.target.value);setReading(null);setManualAnswers({})}} autoComplete="off"/></label>}
    <p style={{fontSize:12}}>Barkod desteklenirse öğrenci ve sınav eşleştirilir. Barkod okunamazsa öğrenci seçip form kimliğini elle doğrulayınız. Sonuçlar otomatik kaydedilmez.</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
      <label style={{flex:'1 1 210px'}}>Galeriden veya dosyalardan yükle
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} style={{display:'block',width:'100%',marginTop:8}}/>
      </label>
      <label style={{flex:'1 1 210px'}}>Kamera ile fotoğraf çek
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={chooseFile} style={{display:'block',width:'100%',marginTop:8}}/>
      </label>
    </div>
    <div style={{border:'1px solid #d1d5db',borderRadius:10,padding:12,marginTop:12}}>
      <strong>Toplu fotoğraf inceleme kuyruğu (en fazla 250 fotoğraf)</strong>
      <p style={{fontSize:12}}>Fotoğraflar yalnızca bu cihazda sırayla açılır; otomatik not kaydı veya öğrenci eşleştirmesi yapılmaz. Her form ayrı ayrı doğrulanmalıdır.</p>
      <label>Birden fazla fotoğraf seç
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={chooseBatchFiles} style={{display:'block',marginTop:6,width:'100%'}}/>
      </label>
      {batchFiles.length>0&&<p style={{fontSize:12}}>Barkodla eşleştirilen form: {Object.keys(batchIdentities).length} · Tekrarlanan barkodlar kontrol gerektirir. Mevcut öğrenci sonuçları da veritabanından sorgulanır.</p>}
      {batchFiles.length>0&&<div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginTop:10}}>
        <button type="button" disabled={batchIndex<=0||busy||saveBusy} onClick={()=>loadQueuedFile(batchIndex-1)}>Önceki fotoğraf</button>
        <strong>{batchIndex+1} / {batchFiles.length}</strong>
        <button type="button" disabled={batchIndex>=batchFiles.length-1||busy||saveBusy} onClick={()=>loadQueuedFile(batchIndex+1)}>Sonraki fotoğraf</button>
        <button type="button" disabled={busy||saveBusy} onClick={()=>{setBatchFiles([]);setBatchIndex(-1);setBatchStatuses({});setBatchIdentities({});setCollectedPages({});setCollectionMessage('');setBatchMessage('Kuyruk temizlendi.');setReading(null);setManualAnswers({});setUrl('');if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current=''}}}>Kuyruğu temizle</button>
        <span style={{fontSize:12,maxWidth:260,overflowWrap:'anywhere'}}>{batchFiles[batchIndex]?.name}</span>
      </div>}
      {batchFiles.length>0&&<>
        <p style={{fontSize:12}}>Bekleyen: {batchCounts.waiting} · İncelenen: {batchCounts.reviewed} · Kontrol gerekli: {batchCounts.needs_review} · Taslak kaydedilen: {batchCounts.saved} · Hatalı: {batchCounts.error}</p>
        <label>Seçili fotoğrafın durumu <select aria-label="Kuyruk işlem durumu" value={batchStatuses[batchIndex]||'waiting'} disabled={batchStatuses[batchIndex]==='saved'} onChange={e=>setBatchStatuses(old=>{if(old[batchIndex]==='saved')return old;const next={...old};if(e.target.value==='waiting')delete next[batchIndex];else next[batchIndex]=e.target.value;return next})}>
          {batchStatuses[batchIndex]==='saved'&&<option value="saved">Taslak kaydedildi</option>}
          <option value="waiting">Bekliyor</option>
          <option value="reviewed">İncelendi (taslak kaydı değil)</option>
          <option value="needs_review">Kontrol gerekli</option>
          <option value="error">Hatalı / tekrar çekilecek</option>
        </select></label>
        <p style={{fontSize:12}}>“Taslak kaydedilen” durumu yalnızca başarılı veritabanı kaydından sonra atanır. Diğer durumlar bu oturuma ait yerel takip notlarıdır.</p>
      </>}
      {batchMessage&&<p role="status">{batchMessage}</p>}
    </div>
    {url&&<div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginTop:10}}>
      <button type="button" onClick={scanBarcode} disabled={barcodeBusy||!dimensions}>{barcodeBusy?'Barkod aranıyor…':'Barkodu Otomatik Oku (Deneme)'}</button>
      <small>Barkod algılama cihaz ve tarayıcı desteğine bağlıdır. Eşleşmeyen veya birden fazla öğrenciyle eşleşen barkod kabul edilmez.</small>
    </div>}
    {barcodeMessage&&<p role="status">{barcodeMessage}</p>}
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
        <button type="button" onClick={analyzePhoto} disabled={!valid||autoCandidate||busy||!examCode||confirmedCode.trim().toUpperCase()!==examCode||!confirmedPage||(expectedStudentNumber&&confirmedStudentNumber.trim()!==expectedStudentNumber)||(!verifiedFormIdentity||confirmedFormIdentity.trim().toUpperCase()!==verifiedFormIdentity)}>{busy?'İnceleniyor…':'Fotoğraftaki cevapları incele'}</button>
        <button type="button" onClick={()=>{setReading(null);setManualAnswers({});setAutoCandidate(false);setCorners(old=>old.slice(0,-1))}} disabled={!corners.length}>Son köşeyi geri al</button>
        <button type="button" onClick={()=>{setReading(null);setManualAnswers({});setAutoCandidate(false);setCorners([])}}>Köşeleri yeniden seç</button>
      </div>
      {autoCandidate&&<p role="status" style={{color:'#92400e'}}>Otomatik köşeler yalnızca tahmindir. Fotoğraftaki gerçek dört kâğıt köşesiyle karşılaştırın; doğruysa doğrulayın, değilse köşeleri yeniden seçin.</p>}
   {pages.length>1&&<div style={{padding:12,border:'1px solid #d1d5db',borderRadius:8,marginTop:10}}>
      <strong>Çok sayfalı optik birleştirme · Geçici inceleme</strong>
      <p>Toplanan sayfalar: {collectedList.length}/{pages.length} · Öğrenci: {collectedList[0]?.studentName||'Henüz belirlenmedi'}</p>
      <p>Eksik sayfalar: {pages.filter(p=>!collectedPages[p.pageNumber]).map(p=>p.pageNumber).join(', ')||'Yok'}</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        {collectedList.map(item=><button type="button" key={item.pageNumber} onClick={()=>{setCollectedPages(old=>{const next={...old};delete next[item.pageNumber];return next});setCollectionMessage(item.pageNumber+'. sayfa gruptan çıkarıldı.')}}>{item.pageNumber}. sayfayı çıkar</button>)}
        <button type="button" disabled={!collectedList.length} onClick={()=>{setCollectedPages({});setCollectionMessage('Sayfa grubu temizlendi.')}}>Grubu temizle</button>
      </div>
      {collectionComplete&&combinedScore&&<p role="status"><strong>Tüm sayfalar toplandı · Geçici toplam puan: {combinedScore.score}/100</strong> · Doğru: {combinedScore.correct} · Yanlış: {combinedScore.wrong} · Boş: {combinedScore.blank}</p>}
      {collectionComplete&&combinedScore&&<div style={{marginTop:10,borderTop:'1px solid #d1d5db',paddingTop:10}}>
        <label style={{display:'flex',alignItems:'flex-start',gap:8}}>
          <input type="checkbox" checked={reviewConfirmed} onChange={e=>setReviewConfirmed(e.target.checked)}/>
          Bütün sayfaları ve cevapları basılı kâğıtlarla karşılaştırdım; yalnızca inceleme bekleyen taslak olarak kaydedilmesini onaylıyorum.
        </label>
        <button type="button" disabled={!multiSaveReady||saveBusy} onClick={saveMultiPageResult} style={{marginTop:8}}>
          {saveBusy?'Kaydediliyor…':'Tüm Sayfaları Taslak Kaydet'}
        </button>
        {saveMessage&&<p role="status">{saveMessage}</p>}
        {!savedExamId&&<p>Önce sınavı kalıcı olarak kaydediniz.</p>}
      </div>}
      <p style={{fontSize:12}}>Sayfalar inceleme sırasında geçici tutulur. Tamamı kontrol edildikten sonra yalnızca inceleme bekleyen sonuç taslağı kaydedilebilir; kesin not değildir.</p>
      {collectionMessage&&<p role="status">{collectionMessage}</p>}
    </div>}
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
        {pages.length>1&&<button type="button" disabled={!identifiedStudent||pendingReviews!==0||provisionalScore?.review!==0||Boolean(collectedPages[pageNumber])} onClick={collectCurrentPage}>Kontrol Edilen {pageNumber}. Sayfayı Gruba Ekle</button>}
        <p style={{fontSize:12}}>Gerçek baskı ve kamera kalibrasyonu yapılmamıştır. Kaydedilen sonuç yalnızca yönetici inceleme taslağıdır; kesin not veya veliye açık sonuç değildir.</p>
        {savedExamId&&<div style={{borderTop:'1px solid #d1d5db',paddingTop:12}}>
          <label style={{display:'flex',alignItems:'flex-start',gap:8}}>
            <input type="checkbox" checked={reviewConfirmed} onChange={e=>setReviewConfirmed(e.target.checked)}/>
            Optik kâğıdını ve bütün cevapları gözle kontrol ettim; yalnızca inceleme bekleyen taslak kaydı oluşturulmasını istiyorum.
          </label>
          <button type="button" onClick={saveReviewedResult} disabled={!saveReady||saveBusy} style={{marginTop:10}}>{saveBusy?'Kaydediliyor…':'Kontrol Edilen Sonucu Taslak Kaydet'}</button>
          {!identifiedStudent&&<p>Kaydetmek için barkodla öğrenci eşleştirmesi gereklidir.</p>}
          {saveMessage&&<p role="status">{saveMessage}</p>}
        </div>}
      </div>}
      {corners.length===4&&<p role="status">{valid?'Dört köşe matematiksel olarak eşleştirildi. Bu, optik okuma doğrulaması değildir.':'Köşeler geçersiz. Yeniden seçin.'}</p>}
    </div>}
  </section>
}
