'use client'
export default function ArchiveBars({title,data=[]}){
 const max=Math.max(1,...data.map(x=>Number(x[1])||0))
 const total=data.reduce((a,x)=>a+(Number(x[1])||0),0)
 return <div className="archiveChart">
  <div className="archiveChartHead"><h3>{title}</h3><span>{total} kayıt</span></div>
  <div className="archiveBarList">{data.length?data.map(([label,count])=><div className="archiveBarRow" key={String(label)}>
   <span>{label}</span><div className="archiveBarTrack"><i style={{width:((Number(count)||0)/max*100)+'%'}}/></div><b>{count}</b>
  </div>):<p className="muted">Henüz veri bulunmuyor.</p>}</div>
 </div>
}
