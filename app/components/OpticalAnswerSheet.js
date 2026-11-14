'use client'
import { buildOpticalLayout } from '../lib/opticalLayout.js'
import { buildPrintPages, PAPER, REGISTRATION_MARKS } from '../lib/opticalTemplate.js'

/** Önizleme ve baskı aynı milimetre koordinatlarını kullanır.
 * Fiziksel baskı/telefon kalibrasyonu henüz doğrulanmamıştır.
 */
export default function OpticalAnswerSheet({ questionCount = 20, examCode = '', examTitle = 'Sınav' }) {
  const layout = buildOpticalLayout({ questionCount, examCode })
  const pages = buildPrintPages(layout.questionCount)
  return <section className="geys-optical-document" aria-label="Optik cevap formları">
    <style>{`
      .geys-optical-document{overflow-x:auto}
      .geys-optical-page{position:relative;width:210mm;height:297mm;box-sizing:border-box;background:#fff;color:#142436;font-family:Arial,sans-serif;margin:12px auto;border:1px solid #cbd5e1;overflow:hidden}
      .geys-optical-page .geys-optical-header{position:absolute;left:19mm;right:19mm;top:20mm;text-align:center;font-size:11pt}
      .geys-optical-header h2{font-size:13pt;margin:4mm 0}
      .geys-optical-fields{position:absolute;left:19mm;right:19mm;top:58mm;display:grid;grid-template-columns:1fr 1fr;gap:5mm;font-size:10pt}
      .geys-optical-field{border-bottom:1px solid #344054;height:9mm}
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
        <div className="geys-optical-field">Adı Soyadı:</div>
        <div className="geys-optical-field">Sınıfı:</div>
        <div className="geys-optical-field">Öğrenci No:</div>
        <div className="geys-optical-field">Tarih:</div>
      </div>
      {page.rows.map(row => <div key={row.number}>
        <span className="geys-optical-row-number" style={{left:`${row.numberX}mm`,top:`${row.y}mm`}}>{row.number}.</span>
        {row.bubbles.map(b=><span key={b.option}>
          <span className="geys-optical-option" style={{left:`${b.x}mm`,top:`${b.y-5}mm`}}>{b.option}</span>
          <span className="geys-optical-bubble" style={{left:`${b.x}mm`,top:`${b.y}mm`}} aria-label={`${row.number}-${b.option}`}/>
        </span>)}
      </div>)}
      <footer className="geys-optical-footer">Her soruda tek seçeneği tamamen doldurunuz. Bu şablonun otomatik fotoğraf okuması henüz kalibre edilmemiştir.</footer>
    </article>)}
  </section>
}
