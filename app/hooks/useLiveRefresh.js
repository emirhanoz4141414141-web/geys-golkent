'use client'
import {useEffect,useRef} from 'react'

export default function useLiveRefresh(supabase,tables,onRefresh){
 const cb=useRef(onRefresh),timer=useRef(null)
 cb.current=onRefresh
 useEffect(()=>{
  if(!supabase||!tables?.length)return
  const names=[...new Set(tables)].filter(Boolean)
  const run=()=>{clearTimeout(timer.current);timer.current=setTimeout(()=>{if(document.visibilityState==='visible')cb.current?.()},350)}
  const channel=supabase.channel('egolkent-live-'+names.join('-').slice(0,80)+'-'+Math.random().toString(36).slice(2,7))
  names.forEach(table=>channel.on('postgres_changes',{event:'*',schema:'public',table},run))
  channel.subscribe()
  const visible=()=>{if(document.visibilityState==='visible')cb.current?.()}
  const focus=()=>cb.current?.()
  document.addEventListener('visibilitychange',visible)
  window.addEventListener('focus',focus)
  return()=>{clearTimeout(timer.current);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',focus);supabase.removeChannel(channel)}
 },[supabase,(tables||[]).join('|')])
}
