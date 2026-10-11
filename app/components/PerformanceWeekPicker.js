'use client';
import {useEffect,useState} from 'react';
export const currentPerformanceMonday=()=>{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const get=k=>parts.find(p=>p.type===k)?.value;
 const date=new Date(Date.UTC(Number(get('year')),Number(get('month'))-1,Number(get('day'))));
 date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
 return date.toISOString().slice(0,10);
};
export const normalizePerformanceMonday=value=>{
 if(!value)return currentPerformanceMonday();
 const date=new Date(value+'T12:00:00Z');
 if(Number.isNaN(date.getTime()))return currentPerformanceMonday();
 date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
 return date.toISOString().slice(0,10);
};
export default function PerformanceWeekPicker({week,onChange,editable=false,onEditChange}){
 const [current,setCurrent]=useState(currentPerformanceMonday);
 useEffect(()=>{const check=()=>{const next=currentPerformanceMonday();setCurrent(old=>{if(old!==next){onChange(next);onEditChange?.(false)}return next})};const timer=setInterval(check,60000);document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',check);window.removeEventListener('focus',check)}},[onChange,onEditChange]);
 const archive=week!==current;
 return <div className="perfWeekPicker"><label>Hafta başlangıcı (Pazartesi)<input type="date" value={week} max={current} onChange={e=>{onChange(normalizePerformanceMonday(e.target.value));onEditChange?.(false)}}/></label>
 <span className={'perfWeekBadge '+(archive?'archive':'current')}>{archive?'Geçmiş Hafta · Arşiv Görünümü':'Güncel Hafta'}</span>
 {archive&&<button type="button" onClick={()=>{onChange(current);onEditChange?.(false)}}>Güncel Haftaya Dön</button>}
 {archive&&onEditChange&&<label className="perfArchiveUnlock"><input type="checkbox" checked={!!editable} onChange={e=>onEditChange(e.target.checked)}/> Geçmiş Hafta Düzenlemesini Aç</label>}
 {archive&&onEditChange&&!editable&&<p className="perfWeekWarning">Arşiv yalnızca görüntüleniyor. Kayıt yapmak için düzenlemeyi ayrıca açınız.</p>}
 </div>;
}
