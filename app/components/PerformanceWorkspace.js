'use client';
import {useCallback,useState} from 'react';
import useLiveRefresh from '../hooks/useLiveRefresh';
import {ClipboardCheck,ShieldCheck,LayoutDashboard,GraduationCap,CalendarDays,ArrowRight} from 'lucide-react';
import PerformanceReviewPanel from './PerformanceReviewPanel';
import PerformanceManagerPanel from './PerformanceManagerPanel';
import PerformanceWeeklyDashboard from './PerformanceWeeklyDashboard';
import './PerformanceWorkspace.css';

export default function PerformanceWorkspace({supabase,students=[],classes=[],profile,performanceRefresh,onDecisionSaved}){
 const manager=['admin','super_admin'].includes(profile?.role);
 const [tab,setTab]=useState(manager?'overview':'review');
 const [liveVersion,setLiveVersion]=useState(0);
 const refreshPerformance=useCallback(()=>setLiveVersion(v=>v+1),[]);
 useLiveRefresh(supabase,['performance_weekly_reviews','performance_deductions','performance_exit_decisions'],refreshPerformance);
 const tabs=manager?[
  {id:'overview',title:'Genel Bakış',subtitle:'Haftalık cetvel ve kararlar',Icon:LayoutDashboard},
  {id:'review',title:'Öğrenci Değerlendirme',subtitle:'Ders, hazırlık ve davranış',Icon:GraduationCap},
  {id:'approval',title:'Çıkış Onayları',subtitle:'Yönetici karar ekranı',Icon:ShieldCheck}
 ]:[{id:'review',title:'Öğrenci Değerlendirme',subtitle:'Yetkili öğrencileriniz',Icon:GraduationCap}];
 return <div className="perfWorkspace">
  <div className="perfHero">
   <div className="perfHeroCopy"><span className="perfEyebrow"><span className="perfDot"/> E-GÖLKENT · EĞİTİM YÖNETİMİ</span>
    <h2>Öğrenci Performans Merkezi</h2>
    <p>Haftalık ders takibi, gelişim değerlendirmesi ve çıkış süreçleri. Tüm işlemler tek merkezde, görevlerine göre düzenlenmiş şekilde.</p>
    <div className="perfHeroMeta"><span><CalendarDays size={15}/> Haftalık değerlendirme</span><span><ShieldCheck size={15}/> Yetkiye dayalı erişim</span></div>
   </div><div className="perfHeroSymbol"><ClipboardCheck size={66} strokeWidth={1.2}/><span>GÖLKENT</span></div>
  </div>
  <div className="perfNav" role="tablist" aria-label="Performans yönetimi bölümleri">
   {tabs.map(({id,title,subtitle,Icon})=><button key={id} type="button" role="tab" aria-selected={tab===id} className={'perfNavItem '+(tab===id?'selected':'')} onClick={()=>setTab(id)}>
    <span className="perfNavIcon"><Icon size={21}/></span><span className="perfNavText"><strong>{title}</strong><small>{subtitle}</small></span><ArrowRight className="perfNavArrow" size={16}/>
   </button>)}
  </div>
  <div className="perfSectionIntro"><div><span className="perfSectionEyebrow">{tab==='overview'?'YÖNETİCİ GÖRÜNÜMÜ':tab==='approval'?'YÖNETİCİ İŞLEMLERİ':'ÖĞRETİCİ İŞLEMLERİ'}</span><h3>{tabs.find(t=>t.id===tab)?.title}</h3><p>{tab==='overview'?'Öğrencilerin haftalık durumlarını inceleyin, arama ve filtrelerle gerekli kayıtlara ulaşın.':tab==='approval'?'Ders ve hazırlık durumunu kontrol ederek çıkış kararlarını güvenle yönetin.':'Öğrenci seçerek haftalık performansını ve ders hazırlığını değerlendirin.'}</p></div></div>
  <div className="perfSurface" role="tabpanel">
   {tab==='overview'&&manager&&<PerformanceWeeklyDashboard supabase={supabase} students={students} classes={classes} refreshKey={performanceRefresh+liveVersion}/>}
   {tab==='review'&&<PerformanceReviewPanel supabase={supabase} students={students} classes={classes} profile={profile} refreshKey={liveVersion}/>}
   {tab==='approval'&&manager&&<PerformanceManagerPanel supabase={supabase} students={students} classes={classes} onDecisionSaved={onDecisionSaved} refreshKey={liveVersion}/>}
  </div>
 </div>;
}
