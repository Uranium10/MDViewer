"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractHeadings, safeFilename } from "@/lib/markdown";
import { useReaderSettings } from "@/hooks/useReaderSettings";
import ScrollReader from "./ScrollReader";
import PaginatedReader from "./PaginatedReader";
import ReaderSettings from "./ReaderSettings";
import ReaderTableOfContents from "./ReaderTableOfContents";

type Props={documentId:string;title:string;markdown:string;preview?:boolean;onBack?:()=>void;onShare?:()=>void};
export default function NovelReader({documentId,title,markdown,preview=false,onBack,onShare}:Props){
 const{settings,setSettings,ready}=useReaderSettings();const[toc,setToc]=useState(false);const[drawer,setDrawer]=useState(false);const[progress,setProgress]=useState(0);const[target,setTarget]=useState<string|null>(null);const readerNode=useRef<HTMLElement>(null);const pull=useRef<{y:number;closing:boolean}|null>(null);const drawerDrag=useRef(0);const drawerNode=useRef<HTMLDivElement>(null);const drawerFrame=useRef<number|null>(null);const themeAudio=useRef<HTMLAudioElement|null>(null);const headings=useMemo(()=>extractHeadings(markdown),[markdown]);
 useEffect(()=>{if(preview||!ready)return;try{const saved=JSON.parse(localStorage.getItem(`reader-position:${documentId}`)||"{}");if(typeof saved.progress==="number")setProgress(saved.progress)}catch{}},[documentId,preview,ready]);
 useEffect(()=>{if(preview||!ready)return;const timer=setTimeout(()=>localStorage.setItem(`reader-position:${documentId}`,JSON.stringify({progress,updatedAt:Date.now()})),250);return()=>clearTimeout(timer)},[progress,documentId,preview,ready]);
 useEffect(()=>{const player=new Audio("/lock.mp3");player.preload="auto";player.volume=.5;player.load();themeAudio.current=player;return()=>{player.pause();themeAudio.current=null}},[]);
 const updateProgress=useCallback((n:number)=>setProgress(old=>{const next=Math.max(0,Math.min(1,n));return Math.abs(old-next)<.0005?old:next}),[]);const toggleDrawer=useCallback(()=>setDrawer(v=>!v),[]);const closeDrawer=useCallback(()=>setDrawer(false),[]);const widths={narrow:"640px",default:"720px",wide:"800px"};
 const toggleTheme=useCallback(()=>{const player=themeAudio.current;if(player){player.currentTime=0;void player.play().catch(()=>{})}setSettings(s=>({...s,theme:s.theme==="light"?"dark":"light"}))},[setSettings]);
 const selectHeading=(id:string)=>{setToc(false);setTarget(id);if(settings.mode==="scroll")requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"}))};
 const download=()=>{const url=URL.createObjectURL(new Blob([markdown],{type:"text/markdown;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`${safeFilename(title)}.md`;a.click();URL.revokeObjectURL(url)};
 const back=()=>{if(onBack)return onBack();if(confirm("정말 Reader에서 나가시겠습니까?")){if(history.length>1)history.back();else location.assign("/")}};
 const share=()=>{if(onShare)return onShare();if(navigator.share)void navigator.share({title,url:location.href});else void navigator.clipboard.writeText(location.href)};
 const pullDown=(e:React.PointerEvent)=>{const handle=(e.target as HTMLElement).closest(".drawer-handle");if(drawer&&!handle)return;const top=readerNode.current?.getBoundingClientRect().top??0;if(!drawer&&e.clientY-top>54)return;pull.current={y:e.clientY,closing:drawer};drawerNode.current?.classList.add("is-dragging");e.currentTarget.setPointerCapture(e.pointerId)};const pullMove=(e:React.PointerEvent)=>{if(!pull.current)return;const dy=e.clientY-pull.current.y;drawerDrag.current=pull.current.closing?Math.min(0,Math.max(-420,dy)):Math.min(520,Math.max(0,dy));if(drawerFrame.current!==null)return;drawerFrame.current=requestAnimationFrame(()=>{if(drawerNode.current)drawerNode.current.style.transform=pull.current?.closing?`translateY(${drawerDrag.current}px)`:`translateY(calc(-100% + ${drawerDrag.current}px))`;drawerFrame.current=null})};const pullEnd=()=>{if(pull.current?.closing&&drawerDrag.current<-70)setDrawer(false);else if(!pull.current?.closing&&drawerDrag.current>70)setDrawer(true);drawerDrag.current=0;if(drawerFrame.current!==null)cancelAnimationFrame(drawerFrame.current);drawerFrame.current=null;if(drawerNode.current){drawerNode.current.classList.remove("is-dragging");drawerNode.current.style.transform=""}pull.current=null};
 return <main ref={readerNode} className={`novel-reader theme-${settings.theme} font-${settings.fontFamily} mode-${settings.mode} ${preview?"is-preview":""}`} style={{"--reader-font-size":`${settings.fontSize}px`,"--reader-line-height":settings.lineHeight,"--reader-max-width":widths[settings.width]} as React.CSSProperties} onPointerDown={pullDown} onPointerMove={pullMove} onPointerUp={pullEnd} onPointerCancel={pullEnd}>
  <div className="reader-status"><span className="status-grip">⌄</span><strong>{title}</strong><span>{Math.round(progress*100)}%</span></div>
  <div ref={drawerNode} className={`quick-drawer ${drawer?"is-open":""}`}>
   <div className="brightness-row"><button className={`epaper-theme ${settings.theme==="dark"?"is-moon":"is-sun"}`} onClick={toggleTheme} aria-label={settings.theme==="dark"?"밝은 화면으로 전환":"어두운 화면으로 전환"}><i aria-hidden="true"/><small>{settings.theme==="dark"?"달빛":"햇빛"}</small></button></div><ReaderSettings value={settings} onChange={setSettings} onClose={closeDrawer} embedded/><button className="drawer-handle" onClick={closeDrawer} aria-label="설정 닫기"><span/></button>
  </div>
  <div className="reader-body">{settings.mode==="scroll"?<ScrollReader markdown={markdown} progress={progress} onProgress={updateProgress} restore={progress}/>:<PaginatedReader key={`${settings.fontSize}:${settings.lineHeight}:${settings.fontFamily}:${settings.width}`} markdown={markdown} progress={progress} onProgress={updateProgress} onUiToggle={toggleDrawer} goToId={target}/>}</div>
  <nav className="feature-toolbar" aria-label="Reader 메뉴"><Tool icon="back" label="뒤로" onClick={back}/><Tool icon="toc" label="목차" onClick={()=>setToc(v=>!v)}/><Tool icon="share" label="공유" onClick={share}/><Tool icon="down" label="저장" onClick={download}/></nav>
  {toc&&<ReaderTableOfContents headings={headings} onSelect={selectHeading} onClose={()=>setToc(false)}/>} {settings.mode==="page"&&<div className="page-progress"><span style={{width:`${progress*100}%`}}/></div>}
 </main>
}
function Tool({icon,label,onClick}:{icon:string;label:string;onClick:()=>void}){return <button onClick={onClick}><i className={`pixel-icon icon-${icon}`} aria-hidden="true"/><span>{label}</span></button>}
