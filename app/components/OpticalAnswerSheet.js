'use client'
import { buildFormIdentity, code39Bars } from '../lib/opticalFormIdentity.js'
import { buildOpticalLayout } from '../lib/opticalLayout.js'
import { buildPrintPages, PAPER, REGISTRATION_MARKS } from '../lib/opticalTemplate.js'

/** Önizleme ve baskı aynı milimetre koordinatlarını kullanır.
 * Fiziksel baskı/telefon kalibrasyonu henüz doğrulanmamıştır.
 */
export default function OpticalAnswerSheet({ questionCount = 20, examCode = '', examTitle = 'Sınav', studentName = '', studentNumber = '', studentClass = '' }) {
  const layout = buildOpticalLayout({ questionCount, examCode })
  const pages = buildPrintPages(layout.questionCount)
  return <section className="geys-optical-document" aria-label="Optik cevap formları">
    <style>{`
      .geys-optical-document{overflow-x:auto}
      .geys-optical-page{position:relative;width:210mm;height:297mm;box-sizing:border-box;background:#fff;color:#142436;font-family:Arial,sans-serif;margin:12px auto;border:1px solid #cbd5e1;overflow:hidden}
      .geys-optical-page .geys-optical-header{position:absolute!important;display:block!important;left:19mm;right:19mm;top:19mm;text-align:center;font-size:10pt;line-height:1.25;white-space:normal}
      .geys-optical-header>strong,.geys-optical-header>div,.geys-optical-header>small{display:block!important;width:100%;margin:0 auto;line-height:1.3}
      .geys-optical-header>strong{font-size:10pt;letter-spacing:.2px}
      .geys-optical-header h2{display:block!important;font-size:12pt;line-height:1.25;margin:2mm 0 1mm;font-weight:700}
      .geys-optical-barcode{position:absolute;top:78mm;left:19mm;right:19mm;text-align:center;font-size:8pt}
      .geys-optical-barcode svg{display:block;width:150mm;height:10mm;margin:0 auto}
      .geys-optical-fields{position:absolute;left:19mm;right:19mm;top:52mm;display:grid;grid-template-columns:1fr 1fr;column-gap:5mm;row-gap:3mm;font-size:10pt}
      .geys-optical-field{border-bottom:1px solid #344054;height:9mm;box-sizing:border-box;white-space:nowrap;overflow:hidden}
      .geys-optical-mark{position:absolute;width:5mm;height:5mm;background:#111;transform:translate(-50%,-50%)}
      .geys-optical-row-number{position:absolute;transform:translateY(-50%);font-size:10pt;font-weight:bold}
      .geys-optical-bubble{position:absolute;border:0.45mm solid #111;border-radius:50%;width:5.8mm;height:5.8mm;box-sizing:border-box;transform:translate(-50%,-50%);background:#fff}
      .geys-optical-option{position:absolute;transform:translate(-50%,-50%);font-size:7pt;color:#222}
      .geys-optical-footer{position:absolute;left:19mm;right:19mm;bottom:17mm;font-size:9pt;text-align:center}
      @page{size:A4 portrait;margin:0}
      @media print{
        body *{visibility:hidden!important}
        .geys-optical-document,.geys-optical-document *{visibility:visible!important}
        .geys-optical-document{position:absolute;left:0;top:0;overflow:visible;width:210mm}
        .geys-optical-page{border:0;margin:0;width:210mm;height:297mm;break-after:page;page-break-after:always;print-color-adjust:exact;-webkit-print-color-adjust:exact}
        .geys-optical-page:last-child{break-after:auto;page-break-after:auto}
      }
    `}</style>
    {pages.map(page => <article key={page.pageNumber} className="geys-optical-page">
      {REGISTRATION_MARKS.map((m,i)=><span key={i} className="geys-optical-mark" style={{left:`${m.x}mm`,top:`${m.y}mm`}} aria-hidden="true"/>)}
      <header className="geys-optical-header">
        <strong>T.C. DİYANET İŞLERİ BAŞKANLIĞI</strong>
        <div>Kocaeli / İzmit Müftülüğü</div>
        <div>Gölkent Erkek Yatılı Hafızlık Kur’an Kursu</div>
        <h2>{examTitle} — OPTİK CEVAP FORMU</h2>
        <small>Sınav kodu: {layout.examCode || '…………'} · Sayfa {page.pageNumber}/{page.pageCount}</small>
      </header>
      <div className="geys-optical-fields">
        <div className="geys-optical-field">Adı Soyadı: {studentName}</div>
        <div className="geys-optical-field">Sınıfı: {studentClass}</div>
        <div className="geys-optical-field">Öğrenci No: {studentNumber}</div>
        <div className="geys-optical-field">Tarih:</div>
      </div>
      {(()=>{const identity=buildFormIdentity({examCode:layout.examCode,studentNumber,pageNumber:page.pageNumber});const encoded=identity&&code39Bars(identity);return encoded?<div className="geys-optical-barcode"><svg viewBox={`0 0 ${encoded.width} 36`} preserveAspectRatio="none" role="img" aria-label="Forma özel Code 39 barkod"><rect width={encoded.width} height="36" fill="white"/>{encoded.bars.map((bar,i)=><rect key={i} x={bar.x} y="0" width={bar.width} height="36" fill="black"/>)}</svg><span>Form kimliği: {identity}</span></div>:<div className="geys-optical-barcode" role="status" style={{color:'#9a3412',fontWeight:700}}>BARKOD OLUŞTURULAMADI — {studentNumber?'Kod uzunluğu veya kimlik bilgileri uygun değil.':'Öğrenci numarası girilmedi.'} Kimlik kontrolünü elle yapınız.</div>})()}
      {page.rows.map(row => <div key={row.number}>
        <span className="geys-optical-row-number" style={{left:`${row.numberX}mm`,top:`${row.y}mm`}}>{row.number}.</span>
        {row.bubbles.map(b=><span key={b.option}>
          <span className="geys-optical-option" style={{left:`${b.x}mm`,top:`${b.y-5}mm`}}>{b.option}</span>
          <span className="geys-optical-bubble" style={{left:`${b.x}mm`,top:`${b.y}mm`}} aria-label={`${row.number}-${b.option}`}/>
        </span>)}
      </div>)}
      <footer className="geys-optical-footer">Her soruda tek seçeneği tamamen doldurunuz. Barkod kimliği henüz fotoğraftan otomatik okunmaz. Optik okuma kalibre edilmemiştir.</footer>
    </article>)}
  </section>
}
