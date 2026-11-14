'use client'
import { buildOpticalLayout } from '../lib/opticalLayout.js'

/**
 * Yazdırılabilir A4 optik cevap formu.
 * Her sayfada öğrenci kimlik alanları elle doldurulur; hiçbir veri gönderilmez.
 * Kamera okuyucusu geliştirilmeden otomatik okuma iddiasında bulunulmaz.
 */
export default function OpticalAnswerSheet({ questionCount = 20, examCode = '', examTitle = 'Sınav' }) {
  // Bir A4 sayfaya sığmayan formları kesilmiş biçimde yazdırma.
  // Çok sayfalı kalibre edilmiş şablon hazırlanmadığı için güvenli sınır.
  if (questionCount > 40) return <section role="alert" style={{padding:16,border:'1px solid #d97706',borderRadius:8}}>
    Bu önizleme tek sayfalık optik form için en fazla 40 soruyu destekler. {questionCount} soruluk sınav için çok sayfalı, kalibre edilmiş şablon henüz hazır değildir. Eksik cevap formu yazdırılmadı.
  </section>
  const layout = buildOpticalLayout({ questionCount, examCode })
  return <section className="geys-optical-page" aria-label="Optik cevap formu">
    <style>{`
      .geys-optical-page{font-family:Arial,sans-serif;background:white;color:#152638;max-width:210mm;margin:auto;padding:12mm;border:1px solid #cbd5e1;box-sizing:border-box}
      .geys-optical-page *{box-sizing:border-box}
      .geys-optical-title{text-align:center;border-bottom:2px solid #152638;padding-bottom:8px}
      .geys-optical-title h2{font-size:16px;margin:4px 0}
      .geys-optical-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0;font-size:12px}
      .geys-optical-field{border-bottom:1px solid #344054;min-height:28px}
      .geys-optical-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:20px;row-gap:4px}
      .geys-optical-row{display:flex;align-items:center;gap:12px;min-height:23px;border-bottom:1px solid #e2e8f0;font-size:12px;break-inside:avoid}
      .geys-optical-num{font-weight:700;min-width:22px}
      .geys-optical-bubble{display:inline-flex;align-items:center;justify-content:center;width:21px;height:21px;border:1.5px solid #111827;border-radius:50%;font-size:9px;position:relative;margin-left:12px}
      .geys-optical-note{margin-top:16px;font-size:11px}
      @page{size:A4 portrait;margin:0}
      @media print{body *{visibility:hidden!important}.geys-optical-page,.geys-optical-page *{visibility:visible!important}.geys-optical-page{position:absolute;top:0;left:0;width:210mm;max-width:none;min-height:297mm;border:0;margin:0;box-shadow:none}.geys-optical-row{print-color-adjust:exact}}
    `}</style>
    <header className="geys-optical-title">
      <strong>T.C. DİYANET İŞLERİ BAŞKANLIĞI</strong>
      <div>Kocaeli / İzmit Müftülüğü</div>
      <div>Gölkent Erkek Yatılı Hafızlık Kur’an Kursu</div>
      <h2>{examTitle} — OPTİK CEVAP FORMU</h2>
      <small>Sınav kodu: {layout.examCode || '……………………'}</small>
    </header>
    <div className="geys-optical-fields">
      <div className="geys-optical-field">Adı Soyadı:</div>
      <div className="geys-optical-field">Sınıfı:</div>
      <div className="geys-optical-field">Öğrenci No:</div>
      <div className="geys-optical-field">Tarih:</div>
    </div>
    <div className="geys-optical-rows">
      {layout.rows.map(row=><div key={row.number} className="geys-optical-row">
        <span className="geys-optical-num">{row.number}.</span>
        {row.bubbles.map(b=><span key={b.option} className="geys-optical-bubble" aria-label={b.label}><span style={{position:"absolute",left:"-12px",fontSize:9}}>{b.option}</span></span>)}
      </div>)}
    </div>
    <p className="geys-optical-note">Her soruda yalnızca bir seçeneği tamamen doldurunuz. Çift işaretli veya okunamayan cevaplar öğretici kontrolüne alınır.</p>
  </section>
}
