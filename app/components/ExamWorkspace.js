'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { gradeExam } from '../lib/examGrading.js'
import { validateExamDraft } from '../lib/examDraft.js'
import OpticalAnswerSheet from './OpticalAnswerSheet.js'
import OpticalPhotoReview from './OpticalPhotoReview.js'
import {buildCompactFormIdentity} from '../lib/opticalFormIdentity.js'

const EMPTY = () => ({ text: '', options: ['', '', '', ''], correctAnswer: 'A' })
const letters = ['A', 'B', 'C', 'D']

/**
 * İzole sınav hazırlama çalışma alanı.
 * Bilinçli olarak Supabase erişimi / otomatik kayıt / veliye yayın içermez.
 * Canlıya bağlanmadan önce yetki ve veri modeli ayrıca doğrulanmalıdır.
 */
export default function ExamWorkspace({students = [], classes = [], institution = null, supabase = null}) {
  const [examCode, setExamCode] = useState('DENEME')
  const [title, setTitle] = useState('Tecvid 1. Dönem 2. Yazılı')
  const [questions, setQuestions] = useState(() => Array.from({ length: 20 }, EMPTY))
  const [answers, setAnswers] = useState(() => Array(20).fill(''))
  const [mode, setMode] = useState('questions')
  const [showKey, setShowKey] = useState(false)
  const [selectedStudentId,setSelectedStudentId] = useState('')
  const [studentTc,setStudentTc] = useState('')
  const [tcError,setTcError] = useState('')
  const [tcLoading,setTcLoading] = useState(false)
  const tcRequestRef = useRef(0)
  const [examDate,setExamDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [selectedClassId,setSelectedClassId] = useState('')
  const [savedExams,setSavedExams] = useState([])
  const [activeExamId,setActiveExamId] = useState('')
  const [examSaving,setExamSaving] = useState(false)
  const [examMessage,setExamMessage] = useState('')
  const [examLoading,setExamLoading] = useState(false)
  const [bulkPrint,setBulkPrint] = useState(false)
  const [examResults,setExamResults] = useState([])
  const [resultsMessage,setResultsMessage] = useState('')
  const [resultsLoading,setResultsLoading] = useState(false)
  async function refreshSavedExams(){
    if(!supabase)return
    setExamLoading(true)
    const {data,error}=await supabase.from('optical_exams').select('id,exam_code,title,exam_date,status,questions').order('created_at',{ascending:false}).limit(100)
    if(error)setExamMessage('Kayıtlı sınavlar yüklenemedi: '+error.message)
    else setSavedExams(data||[])
    setExamLoading(false)
  }
  useEffect(()=>{refreshSavedExams()},[supabase])
  async function loadExamResults(){
    if(!supabase||!activeExamId){setResultsMessage('Önce kayıtlı bir sınav seçiniz.');return}
    setResultsLoading(true);setResultsMessage('')
    const {data,error}=await supabase.from('optical_exam_results')
      .select('id,student_id,score,correct_count,wrong_count,blank_count,review_count,status,updated_at')
      .eq('exam_id',activeExamId).order('updated_at',{ascending:false}).limit(250)
    if(error){setResultsMessage('Sonuçlar yüklenemedi: '+error.message);setExamResults([])}
    else{setExamResults(data||[]);setResultsMessage(data?.length?'Kayıtlı sonuçlar listelendi.':'Bu sınav için henüz kaydedilmiş sonuç yok.')}
    setResultsLoading(false)
  }
  function openSavedExam(id){
    const exam=savedExams.find(x=>x.id===id)
    if(!exam)return
    setActiveExamId(exam.id)
    setExamResults([]);setResultsMessage('')
    setExamCode(exam.exam_code)
    setTitle(exam.title)
    setExamDate(exam.exam_date)
    setQuestions(exam.questions)
    setAnswers(Array(exam.questions.length).fill(''))
    setExamMessage('Kayıtlı sınav açıldı. Değişikliklerinizi kaydetmeyi unutmayınız.')
  }
  async function saveExam(){
    if(!supabase||examSaving)return
    if(!validation.valid){setExamMessage('Önce soruları ve seçenekleri tamamlayınız.');return}
    if(!examDate){setExamMessage('Sınav tarihi gerekli.');return}
    setExamSaving(true);setExamMessage('')
    const payload={exam_code:derivedExamCode,title,exam_date:examDate,questions,updated_at:new Date().toISOString()}
    const response=activeExamId
      ? await supabase.from('optical_exams').update(payload).eq('id',activeExamId).select('id').single()
      : await supabase.from('optical_exams').insert(payload).select('id').single()
    if(response.error)setExamMessage('Sınav kaydedilemedi: '+response.error.message)
    else{setActiveExamId(response.data.id);setExamMessage('Sınav ve cevap anahtarı kalıcı olarak kaydedildi.');await refreshSavedExams()}
    setExamSaving(false)
  }
  useEffect(()=>{
    tcRequestRef.current += 1
    setStudentTc('');setTcError('');setTcLoading(false)
  },[selectedStudentId,mode])
  async function fetchStudentTc(){
    if(!selectedStudentId||!supabase)return
    setStudentTc('');setTcError('');setTcLoading(true)
    const id=selectedStudentId
    const requestId=++tcRequestRef.current
    try{
      const {data,error}=await supabase.rpc('get_student_national_id_for_optical',{p_student:id})
      if(error)throw error
      if(requestId!==tcRequestRef.current)return
      if(String(data||'').match(/^[0-9]{11}$/))setStudentTc(String(data))
      else if(!data)setTcError('Bu öğrencinin T.C. kimlik numarası kayıtlı değil.')
      else setTcError('T.C. kimlik numarası alınamadı.')
    }catch(e){if(requestId===tcRequestRef.current)setTcError('T.C. kimlik numarasına erişilemedi. Yetkinizi ve bağlantınızı kontrol ediniz.')}
    finally{if(requestId===tcRequestRef.current)setTcLoading(false)}
  }
  const selectedStudent=students.find(s=>String(s.id)===selectedStudentId)
  const selectedClass=classes.find(c=>String(c.id)===selectedClassId)
  const visibleStudents=students.filter(s=>!selectedClassId||String(s.class_id)===selectedClassId)
  const bulkStudents=visibleStudents.filter(s=>s.id&&s.first_name&&s.last_name).slice(0,250)
  const studentName=selectedStudent? [selectedStudent.first_name,selectedStudent.last_name].filter(Boolean).join(' '):''
  const studentNumber=selectedStudent?.registry_no||''
  const studentClass=selectedStudent?.classes?.code||selectedClass?.code||''
  const derivedExamCode=examCode==='DENEME' ? ('SINAV-'+examDate.replaceAll('-','') ) : examCode
  const draft = useMemo(() => ({ title, questions }), [title, questions])
  const validation = useMemo(() => validateExamDraft(draft), [draft])
  const score = useMemo(() => {
    if (!validation.valid) return null
    try { return gradeExam({ answerKey: questions.map(q => q.correctAnswer), answers }) }
    catch { return null }
  }, [validation.valid, questions, answers])
  function editQuestion(index, patch) {
    setQuestions(old => old.map((q, i) => i === index ? { ...q, ...patch } : q))
  }
  function changeCount(next) {
    const count = Number(next)
    if (!Number.isInteger(count) || count < 1 || count > 200) return
    setQuestions(old => Array.from({ length: count }, (_, i) => old[i] || EMPTY()))
    setAnswers(old => Array.from({ length: count }, (_, i) => old[i] || ''))
  }
  return <section className="panel" style={{padding:20}}>
    <div className="panelHead"><div>
      <small>E-GÖLKENT · SINAV YÖNETİMİ · GELİŞTİRME ÖNİZLEMESİ</small>
      <h3>Sınav Hazırlama ve Kontrol</h3>
      <p>Sınavları ve cevap anahtarlarını kaydedebilirsiniz. Optik okuma sonuçları henüz öğrenci kayıtlarına işlenmez.</p>
    </div></div>
    <div className="filters" style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
      <label>Sınav adı <input aria-label="Sınav adı" value={title} maxLength={180} onChange={e=>setTitle(e.target.value)}/></label>
      <label>Sınav kodu <input aria-label="Sınav kodu" value={examCode} maxLength={32} onChange={e=>setExamCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,''))}/></label>
      <label>Soru sayısı <input aria-label="Soru sayısı" type="number" min="1" max="200" value={questions.length} onChange={e=>changeCount(e.target.value)}/></label>
    </div>
    <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:16,padding:12,border:'1px solid #d6e1e9',borderRadius:10}}>
      <label>Kayıtlı sınavlar <select aria-label="Kayıtlı sınav seçimi" value={activeExamId} onChange={e=>{if(e.target.value)openSavedExam(e.target.value);else{setActiveExamId('');setExamMessage('Yeni sınav oluşturabilirsiniz.')}}}><option value="">Yeni sınav</option>{savedExams.map(x=><option key={x.id} value={x.id}>{x.title} · {x.exam_date} · {x.exam_code}</option>)}</select></label>
      <button type="button" onClick={saveExam} disabled={examSaving||!validation.valid}>{examSaving?'Kaydediliyor…':activeExamId?'Sınavı Güncelle':'Sınavı Kaydet'}</button>
      <button type="button" onClick={refreshSavedExams} disabled={examLoading}>{examLoading?'Yükleniyor…':'Listeyi Yenile'}</button>
      {examMessage&&<small role="status" style={{width:'100%'}}>{examMessage}</small>}
    </div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
      <button type="button" className={mode==='questions'?'primary':'ghost'} onClick={()=>setMode('questions')}>Sorular</button>
      <button type="button" className={mode==='check'?'primary':'ghost'} onClick={()=>setMode('check')}>Kontrol ve Deneme</button>
      <button type="button" className={mode==='sheet'?'primary':'ghost'} onClick={()=>{setBulkPrint(false);setMode('sheet')}}>Optik Form</button>
      <button type="button" className={mode==='photo'?'primary':'ghost'} onClick={()=>setMode('photo')}>Fotoğraf İnceleme</button>
      <button type="button" className={mode==='results'?'primary':'ghost'} onClick={()=>setMode('results')}>Sınav Sonuçları</button>
    </div>
    {mode==='results' ? <div style={{padding:14,border:'1px solid #d6e1e9',borderRadius:12}}>
      <h4>Kayıtlı sınav sonuçları</h4>
      <p>Sonuçlar yalnızca yetkili yönetici tarafından görüntülenir. Fotoğraf incelemesi henüz otomatik kayıt yapmaz.</p>
      <button type="button" disabled={!activeExamId||resultsLoading} onClick={loadExamResults}>{resultsLoading?'Yükleniyor…':'Seçili Sınavın Sonuçlarını Getir'}</button>
      {resultsMessage&&<p role="status">{resultsMessage}</p>}
      {examResults.length>0&&<div style={{overflowX:'auto',marginTop:12}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Öğrenci</th><th>Puan</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Kontrol</th><th>Durum</th></tr></thead><tbody>{examResults.map(r=>{const student=students.find(s=>String(s.id)===String(r.student_id));return <tr key={r.id}><td>{student?[student.first_name,student.last_name].filter(Boolean).join(' '):'Kayıtlı öğrenci'}</td><td>{r.score}</td><td>{r.correct_count}</td><td>{r.wrong_count}</td><td>{r.blank_count}</td><td>{r.review_count}</td><td>{r.status==='approved'?'Onaylandı':'İnceleme bekliyor'}</td></tr>})}</tbody></table></div>}
    </div> : mode==='sheet' ? <><p>Optik form önizlemesi: Yazdırma ölçüleri henüz fiziksel olarak doğrulanmadı. Öğrenci bilgileri yalnızca bu formun baskısına yazılır; sisteme kaydedilmez.</p><div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}}>
      <label>Sınav tarihi <input type="date" aria-label="Sınav tarihi" value={examDate} onChange={e=>setExamDate(e.target.value)}/></label>
      <label>Sınıf <select aria-label="Optik sınıf seçimi" value={selectedClassId} onChange={e=>{setSelectedClassId(e.target.value);setSelectedStudentId('')}}><option value="">Tüm sınıflar</option>{classes.map(c=><option key={c.id} value={String(c.id)}>{c.code} {c.name||''}</option>)}</select></label>
      <label>Öğrenci <select aria-label="Optik öğrenci seçimi" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}><option value="">Öğrenci seçiniz</option>{visibleStudents.map(s=><option key={s.id} value={String(s.id)}>{s.first_name} {s.last_name}</option>)}</select></label>
      <p style={{width:'100%',margin:0}}>Sınav kodu: <strong>{derivedExamCode}</strong> · Öğrenci: <strong>{studentName||'Seçilmedi'}</strong> · Sınıf: <strong>{studentClass||'—'}</strong>. T.C. kimlik numarası yalnızca yetkili istek üzerine getirilir; öğrenci değiştirildiğinde temizlenir.</p>
      <div style={{width:'100%',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <button type="button" disabled={!selectedStudent||tcLoading} onClick={fetchStudentTc}>{tcLoading?'Kontrol ediliyor…':'T.C. Kimlik Numarasını Getir'}</button>
        <small>{studentTc?'T.C. kimlik numarası yalnızca bu baskı önizlemesine aktarıldı.':'T.C. kimlik numarası henüz yüklenmedi.'}</small>
        {tcError&&<small role="alert">{tcError}</small>}
      </div>
    </div><div style={{display:'flex',gap:10,margin:'10px 0',alignItems:'center',flexWrap:'wrap'}}>
      <button type="button" className="primary" onClick={()=>{setBulkPrint(false);window.setTimeout(()=>window.print(),80)}} disabled={!selectedStudent}>Tek Öğrenci Yazdır / PDF</button>
      <button type="button" onClick={()=>setBulkPrint(v=>!v)} disabled={!bulkStudents.length}>{bulkPrint?'Toplu Önizlemeyi Kapat':`Toplu Optik Önizleme (${bulkStudents.length} öğrenci)`}</button>
      {bulkPrint&&<button type="button" className="primary" onClick={()=>window.print()}>Tümünü Yazdır / PDF</button>}
      {bulkPrint&&<small role="status" style={{width:'100%'}}>Toplu baskıda yalnızca seçilen sınıfın öğrencileri; sınıf seçilmediyse ilk 250 öğrenci yer alır. T.C. kimlik numaraları topluca getirilmez. Öğrenci fotoğrafları kayıtlıysa eklenir. Baskı öncesi sayfa sayısını kontrol ediniz.</small>}
      <small>PDF için açılan yazdırma penceresinde «PDF olarak kaydet» seçeneğini kullanınız. A4 ve %100 ölçek seçiniz.</small></div>{bulkPrint ? <div aria-label="Toplu optik formlar">{bulkStudents.map(s=><OpticalAnswerSheet key={s.id} logoUrl={institution?.logo_url||'/golkent-logo.png'} questionCount={questions.length} examCode={derivedExamCode} examTitle={title} examDate={examDate} studentName={[s.first_name,s.last_name].filter(Boolean).join(' ')} studentId={String(s.id)} studentClass={s.classes?.code||classes.find(c=>String(c.id)===String(s.class_id))?.code||''} studentPhotoUrl={s.photo_url||''}/>)}</div> : <OpticalAnswerSheet logoUrl={institution?.logo_url||'/golkent-logo.png'} questionCount={questions.length} examCode={derivedExamCode} examTitle={title} examDate={examDate} studentName={studentName} studentId={selectedStudent?.id ? String(selectedStudent.id) : ''} studentNumber={studentNumber} studentClass={studentClass} studentTc={studentTc} studentPhotoUrl={selectedStudent?.photo_url||''}/>}</> : mode==='photo' ? <OpticalPhotoReview questionCount={questions.length} examCode={derivedExamCode} answerKey={validation.valid ? questions.map(q=>q.correctAnswer) : null} studentCandidates={students} expectedStudentNumber={selectedStudent?.id ? '' : studentNumber.trim()} expectedFormIdentity={selectedStudent?.id ? (buildCompactFormIdentity({examCode:derivedExamCode,studentId:String(selectedStudent.id),pageNumber:1})||'') : ''}/> : mode==='questions' ? questions.map((q,i)=><fieldset key={i} style={{border:'1px solid #d6e1e9',borderRadius:12,padding:14,marginBottom:12}}>
      <legend style={{fontWeight:700}}>{i+1}. Soru</legend>
      <textarea aria-label={`${i+1}. soru metni`} dir="auto" rows={2} value={q.text} placeholder="Türkçe veya harekeli Arapça soru metni" onChange={e=>editQuestion(i,{text:e.target.value})} style={{width:'100%',padding:10}}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10,marginTop:10}}>
        {letters.map((letter,j)=><label key={letter} style={{display:'flex',alignItems:'center',gap:6}}>
          <strong>{letter}</strong>
          <input aria-label={`${i+1}. soru ${letter} seçeneği`} dir="auto" style={{flex:1,minWidth:0}} value={q.options[j]} onChange={e=>editQuestion(i,{options:q.options.map((v,k)=>k===j?e.target.value:v)})}/>
        </label>)}
      </div>
      <label style={{display:'block',marginTop:10}}>Doğru cevap{' '}
        <select aria-label={`${i+1}. soru doğru cevabı`} value={q.correctAnswer} onChange={e=>editQuestion(i,{correctAnswer:e.target.value})}>
          {letters.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </label>
    </fieldset>) : <>
      <p><strong>{validation.valid?'Sınav taslağı geçerli.':'Sınav taslağında eksikler var.'}</strong></p>
      {!validation.valid&&<ul>{validation.errors.map((e,i)=><li key={i}>{e}</li>)}</ul>}
      {validation.valid&&<>
        <p>Örnek cevapları işaretleyerek puanlamayı sınayabilirsiniz. Bu gerçek optik okuma değildir.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
          {questions.map((q,i)=><label key={i}>{i+1}. soru{' '}
            <select aria-label={`${i+1}. deneme cevabı`} value={answers[i]} onChange={e=>setAnswers(old=>old.map((v,j)=>i===j?e.target.value:v))}>
              <option value="">Boş</option>{letters.map(x=><option key={x} value={x}>{x}</option>)}
              <option value="MULTI">Çift işaret / belirsiz</option>
            </select>
          </label>)}
        </div>
        {score&&<p style={{marginTop:16}}><strong>Deneme puanı: {score.score} / {score.maximumScore}</strong> · Doğru: {score.correct} · Yanlış: {score.wrong} · Boş: {score.blank} · Kontrol gerekli: {score.review}</p>}
        <button type="button" className="ghost" onClick={()=>setShowKey(v=>!v)}>{showKey?'Cevap anahtarını gizle':'Cevap anahtarını göster'}</button>
        {showKey&&<p>{questions.map((q,i)=>`${i+1}: ${q.correctAnswer}`).join(' · ')}</p>}
      </>}
    </>}
  </section>
}
