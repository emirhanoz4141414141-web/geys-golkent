'use client'
import { buildFormIdentity, buildCompactFormIdentity, code39Bars } from '../lib/opticalFormIdentity.js'
import { buildOpticalLayout } from '../lib/opticalLayout.js'
import { buildPrintPages, PAPER, REGISTRATION_MARKS } from '../lib/opticalTemplate.js'

/** Önizleme ve baskı aynı milimetre koordinatlarını kullanır.
 * Fiziksel baskı/telefon kalibrasyonu henüz doğrulanmamıştır.
 */
export default function OpticalAnswerSheet({ questionCount = 20, examCode = '', examTitle = 'Sınav', examDate = '', logoUrl = '/golkent-logo.png', studentName = '', studentNumber = '', studentId = '', studentClass = '', studentTc = '' }) {
  const layout = buildOpticalLayout({ questionCount, examCode })
  const pages = buildPrintPages(layout.questionCount)
  return <section className="geys-optical-document" aria-label="Optik cevap formları">
    <style>{`
      .geys-optical-document{overflow-x:auto}
      .geys-optical-page{position:relative;width:210mm;height:297mm;box-sizing:border-box;background:#fff;color:#142436;font-family:Arial,sans-serif;margin:12px auto;border:1px solid #cbd5e1;overflow:hidden}
      .geys-optical-page .geys-optical-header{position:absolute!important;display:block!important;left:19mm;right:19mm;top:15mm;text-align:center;font-size:10pt;line-height:1.25}
      .geys-optical-header>strong,.geys-optical-header>div,.geys-optical-header>small{display:block!important;width:100%;margin:0 auto;line-height:1.25}
      .geys-optical-header .geys-logo{display:block;width:25mm;height:25mm;object-fit:contain;margin:0 auto 1mm}
      .geys-optical-header>strong{color:#123c55;font-size:9pt}
      .geys-optical-header h2{display:block!important;font-size:11pt;line-height:1.2;margin:2mm 0 1mm;color:#123c55}
      .geys-optical-barcode{position:absolute;top:175mm;left:111mm;width:75mm;text-align:center;font-size:7pt;z-index:1}
      .geys-optical-barcode.is-full{top:265mm;left:19mm;width:172mm;font-size:6.5pt}
      .geys-optical-barcode.is-full svg{height:7mm}
      .geys-optical-barcode svg{display:block;width:100%;height:10mm;margin:0 auto}
      .geys-optical-fields{position:absolute;left:19mm;right:19mm;top:73mm;display:grid;grid-template-columns:1fr 1fr;column-gap:5mm;row-gap:3mm;font-size:9pt}
      .geys-optical-field{border-bottom:1px solid #344054;height:9mm;box-sizing:border-box;white-space:nowrap;overflow:hidden}
      .geys-optical-page:before{content:'';position:absolute;top:9mm;left:19mm;right:19mm;height:1.5mm;background:#0f6175}
      .geys-optical-page:after{content:'';position:absolute;top:12mm;left:19mm;right:19mm;height:.5mm;background:#c6a25c}
      .geys-optical-page .geys-optical-example{position:absolute!important;inset:auto!important;left:111mm!important;top:111mm!important;right:auto!important;bottom:auto!important;display:block!important;float:none!important;transform:none!important;width:75mm!important;height:auto!important;min-height:0!important;max-height:60mm!important;box-sizing:border-box!important;overflow:hidden!important;padding:4mm!important;margin:0!important;border:1px solid #a9c5d0!important;border-radius:2mm!important;background:#f2f8fa!important;color:#123c55!important;font-size:9pt!important;line-height:1.5!important;z-index:1!important}
      .geys-optical-example-title{font-weight:700;color:#0f6175;border-bottom:1px solid #a9c5d0;padding-bottom:1mm;margin-bottom:2mm}
      .geys-optical-example-circle{display:inline-block;width:5.8mm;height:5.8mm;box-sizing:border-box;border:0.45mm solid #111;border-radius:50%;vertical-align:middle;margin-right:2mm;background:#111}
      .geys-optical-example-circle.invalid{background:#fff;position:relative}
      .geys-optical-example-circle.invalid:after{content:'×';position:absolute;inset:-2px;text-align:center;color:#c0392b;font-size:17pt;line-height:5.8mm}
      .geys-optical-mark{position:absolute;width:5mm;height:5mm;background:#111;transform:translate(-50%,-50%)}
      .geys-optical-row-number{position:absolute;transform:translateY(-50%);font-size:10pt;font-weight:bold}
      .geys-optical-bubble{position:absolute;border:0.45mm solid #111;border-radius:50%;width:5.8mm;height:5.8mm;box-sizing:border-box;transform:translate(-50%,-50%);background:#fff}
      .geys-optical-option{position:absolute;transform:translate(-50%,-50%);font-size:7pt;color:#222}
      .geys-optical-footer{color:#38546b;border-top:1px solid #b6c8d3;padding-top:3mm} 
      .geys-optical-footer{position:absolute;left:19mm;right:19mm;bottom:17mm;font-size:9pt;text-align:center}
      @page{size:A4 portrait;margin:0}
      @media print{
        .geys-optical-document{print-color-adjust:exact;-webkit-print-color-adjust:exact}
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
        <img className="geys-logo" src={logoUrl} alt="Kurs logosu"/>
        <strong>T.C.</strong>
        <strong>DİYANET İŞLERİ BAŞKANLIĞI</strong>
        <div>Kocaeli / İzmit İlçe Müftülüğü</div>
        <div>Gölkent Erkek Yatılı Hafızlık Kur’an Kursu</div>
        <h2>{examTitle} — OPTİK CEVAP FORMU</h2>
        <small>Sınav kodu: {layout.examCode || '…………'} · Sayfa {page.pageNumber}/{page.pageCount}</small>
      </header>
      <div className="geys-optical-fields">
        <div className="geys-optical-field">Adı Soyadı: {studentName}</div>
        <div className="geys-optical-field">Sınıfı: {studentClass}</div>
        <div className="geys-optical-field">T.C. Kimlik No: {studentTc || '____________________'}</div>
        <div className="geys-optical-field">Tarih: {examDate}</div>
      </div>
      {(()=>{const identity=studentId?buildCompactFormIdentity({examCode:layout.examCode,studentId,pageNumber:page.pageNumber}):buildFormIdentity({examCode:layout.examCode,studentNumber,pageNumber:page.pageNumber});const encoded=identity&&code39Bars(identity);return encoded?<div className={page.rows.length>20 ? 'geys-optical-barcode is-full' : 'geys-optical-barcode'}><svg viewBox={`0 0 ${encoded.width} 36`} preserveAspectRatio="none" role="img" aria-label="Forma özel Code 39 barkod"><rect width={encoded.width} height="36" fill="white"/>{encoded.bars.map((bar,i)=><rect key={i} x={bar.x} y="0" width={bar.width} height="36" fill="black"/>)}</svg><span>Form kimliği: {identity}</span></div>:null})()}
      {page.rows.length<=20&&<div className="geys-optical-example" aria-label="Örnek cevap işaretleme"><div className="geys-optical-example-title">CEVAP İŞARETLEME ÖRNEĞİ</div><div><span className="geys-optical-example-circle"/> Doğru: Daireyi tamamen doldurunuz.</div><div><span className="geys-optical-example-circle invalid"/> Yanlış: Çarpı veya çizgi kullanmayınız.</div><div style={{marginTop:'2mm'}}>Her soruda yalnızca <strong>bir</strong> cevap işaretleyiniz. Taşırmadan, koyu kalemle doldurunuz.</div></div>}
      {page.rows.length>0&&page.rows[0].bubbles.map(b=><span key={`heading-${b.option}`} className="geys-optical-option" style={{left:`${b.x}mm`,top:`${page.rows[0].y-5}mm`,fontWeight:700}}>{b.option}</span>)}
      {page.rows.map(row => <div key={row.number}>
        <span className="geys-optical-row-number" style={{left:`${row.numberX}mm`,top:`${row.y}mm`}}>{row.number}.</span>
        {row.bubbles.map(b=><span key={b.option}>
          <span className="geys-optical-bubble" style={{left:`${b.x}mm`,top:`${b.y}mm`}} aria-label={`${row.number}-${b.option}`}/>
        </span>)}
      </div>)}
      <footer className="geys-optical-footer">Her soruda yalnızca bir seçeneği, dairenin içini tamamen doldurarak işaretleyiniz.</footer>
    </article>)}
  </section>
}
