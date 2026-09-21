'use client'
const modules=[
 ['Disiplin','Öğrenci olayları, kurul süreci, uygulanan işlem ve sonuç kayıtları.','student_discipline'],
 ['İzin / Çıkış','İzin başlangıç-bitiş, veli teslimi, dönüş ve mazeret takibi.','student_leaves'],
 ['Yatakhane','Kat, oda ve yatak zimmeti ile yatılı öğrenci yerleşimi.','dormitory_assignments'],
 ['Nöbet','Belletmen/personel nöbet tarihleri, saatleri ve görev notları.','duty_roster'],
 ['Kantin / Muhasebe','Gelir, gider ve öğrenci bakiye hareketleri için mali kayıt altyapısı.','finance_entries'],
 ['Bildirim','Tüm kursa, sınıfa veya öğrenciye yönelik duyuru/bildirim kayıtları.','notifications']
]
export default function OperationsHub(){
 return <><section className="panel"><div className="panelHead"><div><h3>Kurum İşlemleri</h3><p>GEYS idari operasyon modülleri. Her alan bağımsız kayıt ve yetkilendirme altyapısıyla çalışır.</p></div></div></section><div className="opsGrid">{modules.map(([name,desc,key])=><section className="panel opsCard" key={key}><span className="opsStatus">ALTYAPI HAZIR</span><h3>{name}</h3><p>{desc}</p><small>{key}</small></section>)}</div></>
}