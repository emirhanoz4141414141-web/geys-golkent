'use client'
import { useMemo, useState } from 'react'
import { gradeExam } from '../lib/examGrading.js'
import { validateExamDraft } from '../lib/examDraft.js'
import OpticalAnswerSheet from './OpticalAnswerSheet.js'
import OpticalPhotoReview from './OpticalPhotoReview.js'

const EMPTY = () => ({ text: '', options: ['', '', '', ''], correctAnswer: 'A' })
const letters = ['A', 'B', 'C', 'D']

/**
 * İzole sınav hazırlama çalışma alanı.
 * Bilinçli olarak Supabase erişimi / otomatik kayıt / veliye yayın içermez.
 * Canlıya bağlanmadan önce yetki ve veri modeli ayrıca doğrulanmalıdır.
 */
export default function ExamWorkspace() {
  const [examCode, setExamCode] = useState('DENEME')
  const [title, setTitle] = useState('Tecvid 1. Dönem 2. Yazılı')
  const [questions, setQuestions] = useState(() => Array.from({ length: 20 }, EMPTY))
  const [answers, setAnswers] = useState(() => Array(20).fill(''))
  const [mode, setMode] = useState('questions')
  const [showKey, setShowKey] = useState(false)
  const [studentName,setStudentName] = useState('')
  const [studentNumber,setStudentNumber] = useState('')
  const [studentClass,setStudentClass] = useState('')
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
      <p>Bu ekran yalnızca tarayıcı belleğinde çalışır. Öğrenci verisi değiştirmez ve sonuç yayımlamaz.</p>
    </div></div>
    <div className="filters" style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
      <label>Sınav adı <input aria-label="Sınav adı" value={title} maxLength={180} onChange={e=>setTitle(e.target.value)}/></label>
      <label>Sınav kodu <input aria-label="Sınav kodu" value={examCode} maxLength={32} onChange={e=>setExamCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,''))}/></label>
      <label>Soru sayısı <input aria-label="Soru sayısı" type="number" min="1" max="200" value={questions.length} onChange={e=>changeCount(e.target.value)}/></label>
    </div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
      <button type="button" className={mode==='questions'?'primary':'ghost'} onClick={()=>setMode('questions')}>Sorular</button>
      <button type="button" className={mode==='check'?'primary':'ghost'} onClick={()=>setMode('check')}>Kontrol ve Deneme</button>
      <button type="button" className={mode==='sheet'?'primary':'ghost'} onClick={()=>setMode('sheet')}>Optik Form</button>
      <button type="button" className={mode==='photo'?'primary':'ghost'} onClick={()=>setMode('photo')}>Fotoğraf İnceleme</button>
    </div>
    {mode==='sheet' ? <><p>Optik form önizlemesi: Yazdırma ölçüleri henüz fiziksel olarak doğrulanmadı. Öğrenci bilgileri yalnızca bu formun baskısına yazılır; sisteme kaydedilmez.</p><div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}}><label>Öğrenci adı soyadı <input aria-label="Optik form öğrenci adı" maxLength={100} value={studentName} onChange={e=>setStudentName(e.target.value)}/></label><label>Öğrenci numarası <input aria-label="Optik form öğrenci numarası" maxLength={24} value={studentNumber} onChange={e=>setStudentNumber(e.target.value.replace(/[^0-9A-Za-z-]/g,''))}/></label><label>Sınıfı <input aria-label="Optik form sınıfı" maxLength={20} value={studentClass} onChange={e=>setStudentClass(e.target.value)}/></label></div><OpticalAnswerSheet questionCount={questions.length} examCode={examCode} examTitle={title} studentName={studentName} studentNumber={studentNumber} studentClass={studentClass}/></> : mode==='photo' ? <OpticalPhotoReview questionCount={questions.length} examCode={examCode} answerKey={validation.valid ? questions.map(q=>q.correctAnswer) : null}/> : mode==='questions' ? questions.map((q,i)=><fieldset key={i} style={{border:'1px solid #d6e1e9',borderRadius:12,padding:14,marginBottom:12}}>
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
