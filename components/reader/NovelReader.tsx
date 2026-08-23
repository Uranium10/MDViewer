"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractHeadings, safeFilename } from "@/lib/markdown";
import { useReaderSettings } from "@/hooks/useReaderSettings";
import ScrollReader from "./ScrollReader";
import PaginatedReader from "./PaginatedReader";
import ReaderSettings from "./ReaderSettings";
import ReaderTableOfContents from "./ReaderTableOfContents";
import ReaderGuidebook from "./ReaderGuidebook";
import ReaderSharePanel from "./ReaderSharePanel";
import ReaderSavePanel from "./ReaderSavePanel";
import ReaderConfirmDialog from "./ReaderConfirmDialog";
import MarkdownRenderer from "./MarkdownRenderer";

type Props={documentId:string;title:string;markdown:string;preview?:boolean;onBack?:()=>void;onCreateShare?:()=>Promise<string|undefined>;onPageChange?:(current:number,total:number)=>void};
type Popover="share"|"save"|null;
type StoredSession={progress?:unknown;bookmarks?:unknown};

export default function NovelReader({documentId,title,markdown,preview=false,onBack,onCreateShare,onPageChange}:Props){
  const{settings,setSettings,ready}=useReaderSettings();
  const[toc,setToc]=useState(false),[drawer,setDrawer]=useState(false),[guide,setGuide]=useState(false),[popover,setPopover]=useState<Popover>(null),[printing,setPrinting]=useState(false),[leaveConfirm,setLeaveConfirm]=useState(false);
  const[progress,setProgress]=useState(0),[bookmarks,setBookmarks]=useState<number[]>([]),[sessionLoaded,setSessionLoaded]=useState(false),[target,setTarget]=useState<string|null>(null),[notice,setNotice]=useState("");
  const readerNode=useRef<HTMLElement>(null),pull=useRef<{y:number;closing:boolean}|null>(null),drawerDrag=useRef(0),drawerNode=useRef<HTMLDivElement>(null),drawerFrame=useRef<number|null>(null),themeAudio=useRef<HTMLAudioElement|null>(null),noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const headings=useMemo(()=>extractHeadings(markdown),[markdown]);

  useEffect(()=>{if(!ready)return;setSessionLoaded(false);if(preview){setSessionLoaded(true);return}try{const raw=localStorage.getItem(`reader-session:${documentId}`)||localStorage.getItem(`reader-position:${documentId}`)||"{}";const saved=JSON.parse(raw) as StoredSession;if(typeof saved.progress==="number")setProgress(Math.max(0,Math.min(1,saved.progress)));if(Array.isArray(saved.bookmarks))setBookmarks(saved.bookmarks.filter((item):item is number=>typeof item==="number"&&item>=0&&item<=1))}catch{}setSessionLoaded(true)},[documentId,preview,ready]);
  useEffect(()=>{if(preview||!ready||!sessionLoaded)return;const timer=setTimeout(()=>localStorage.setItem(`reader-session:${documentId}`,JSON.stringify({progress,bookmarks,updatedAt:Date.now()})),200);return()=>clearTimeout(timer)},[bookmarks,documentId,preview,progress,ready,sessionLoaded]);
  useEffect(()=>{const player=new Audio("/lock.mp3");player.preload="auto";player.volume=.5;player.load();themeAudio.current=player;return()=>{player.pause();themeAudio.current=null;if(noticeTimer.current)clearTimeout(noticeTimer.current)}},[]);
  useEffect(()=>{const handlePopState=(event:PopStateEvent)=>setGuide(Boolean(event.state?.mdBooksGuide));addEventListener("popstate",handlePopState);return()=>removeEventListener("popstate",handlePopState)},[]);
  useEffect(()=>{if(!popover)return;const close=(event:PointerEvent)=>{const node=event.target as HTMLElement;if(node.closest(".reader-device-popover")||node.closest(`[data-reader-popover="${popover}"]`))return;setPopover(null)};addEventListener("pointerdown",close,true);return()=>removeEventListener("pointerdown",close,true)},[popover]);

  const flash=useCallback((text:string)=>{if(noticeTimer.current)clearTimeout(noticeTimer.current);setNotice(text);noticeTimer.current=setTimeout(()=>setNotice(""),1800)},[]);
  const updateProgress=useCallback((value:number)=>setProgress(old=>{const next=Math.max(0,Math.min(1,value));return Math.abs(old-next)<.0005?old:next}),[]);
  const updateBookmarks=useCallback((next:number[])=>setBookmarks(next),[]);
  const toggleDrawer=useCallback(()=>{setPopover(null);setToc(false);setDrawer(value=>!value)},[]);
  const closeDrawer=useCallback(()=>setDrawer(false),[]);
  const widths={narrow:"640px",default:"720px",wide:"800px"};
  const toggleTheme=useCallback(()=>{const player=themeAudio.current;if(player){player.currentTime=0;void player.play().catch(()=>{})}setSettings(value=>({...value,theme:value.theme==="light"?"dark":"light"}))},[setSettings]);
  const openGuide=useCallback(()=>{setDrawer(false);setToc(false);setPopover(null);history.pushState({...history.state,mdBooksGuide:true},"",location.href);setGuide(true)},[]);
  const closeGuide=useCallback(()=>{setGuide(false);if(history.state?.mdBooksGuide)history.back()},[]);
  const toggleGuide=useCallback(()=>guide?closeGuide():openGuide(),[closeGuide,guide,openGuide]);
  const selectHeading=(id:string)=>{setToc(false);setTarget(id);if(settings.mode==="scroll")requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"}))};
  const downloadMarkdown=()=>{const url=URL.createObjectURL(new Blob([markdown],{type:"text/markdown;charset=utf-8"}));const anchor=document.createElement("a");anchor.href=url;anchor.download=`${safeFilename(title)}.md`;anchor.click();URL.revokeObjectURL(url)};
  const copyText=async()=>{await navigator.clipboard.writeText(markdown);flash("텍스트를 복사했습니다.")};
  const printPdf=()=>{setPrinting(true);requestAnimationFrame(()=>requestAnimationFrame(()=>{const cleanup=()=>setPrinting(false);addEventListener("afterprint",cleanup,{once:true});window.print();setTimeout(cleanup,1500)}))};
  const back=()=>{setDrawer(false);setToc(false);setPopover(null);setLeaveConfirm(true)};
  const confirmBack=()=>{setLeaveConfirm(false);if(onBack)return onBack();if(history.length>1)history.back();else location.assign("/")};
  const togglePopover=(next:Exclude<Popover,null>)=>{setDrawer(false);setToc(false);setPopover(current=>current===next?null:next)};
  const pullDown=(event:React.PointerEvent)=>{const source=event.target as HTMLElement,handle=source.closest(".drawer-handle");if(source.closest("button,input")&&!handle)return;if(drawer&&!handle)return;const top=readerNode.current?.getBoundingClientRect().top??0;if(!drawer&&event.clientY-top>54)return;pull.current={y:event.clientY,closing:drawer};drawerNode.current?.classList.add("is-dragging");event.currentTarget.setPointerCapture(event.pointerId)};
  const pullMove=(event:React.PointerEvent)=>{if(!pull.current)return;const dy=event.clientY-pull.current.y,height=drawerNode.current?.offsetHeight??520;drawerDrag.current=pull.current.closing?Math.min(0,Math.max(-height,dy)):Math.min(height,Math.max(0,dy));if(drawerFrame.current!==null)return;drawerFrame.current=requestAnimationFrame(()=>{if(drawerNode.current)drawerNode.current.style.transform=pull.current?.closing?`translateY(${drawerDrag.current}px)`:`translateY(calc(-100% + ${drawerDrag.current}px))`;drawerFrame.current=null})};
  const pullEnd=()=>{if(pull.current?.closing&&drawerDrag.current<-70)setDrawer(false);else if(!pull.current?.closing&&drawerDrag.current>70)setDrawer(true);drawerDrag.current=0;if(drawerFrame.current!==null)cancelAnimationFrame(drawerFrame.current);drawerFrame.current=null;if(drawerNode.current){drawerNode.current.classList.remove("is-dragging");drawerNode.current.style.transform=""}pull.current=null};

  return <main ref={readerNode} className={`novel-reader theme-${settings.theme} font-${settings.fontFamily} mode-${settings.mode} ${preview?"is-preview":""}`} style={{"--reader-font-size":`${settings.fontSize}px`,"--reader-line-height":settings.lineHeight,"--reader-max-width":widths[settings.width]} as React.CSSProperties} onPointerDown={pullDown} onPointerMove={pullMove} onPointerUp={pullEnd} onPointerCancel={pullEnd}>
    <div className="reader-status"><span className="status-grip" aria-hidden="true"/><strong>{guide?"MD북스 도움말":title}</strong><button className="reader-help" onClick={toggleGuide} aria-label={guide?"MD북스 도움말 닫기":"MD북스 도움말 열기"} aria-expanded={guide}><i className="pixel-icon icon-help" aria-hidden="true">?</i></button></div>
    <div ref={drawerNode} className={`quick-drawer ${drawer?"is-open":""}`}><div className="brightness-row"><button className={`epaper-theme ${settings.theme==="dark"?"is-moon":"is-sun"}`} onClick={toggleTheme} aria-label={settings.theme==="dark"?"밝은 화면으로 전환":"어두운 화면으로 전환"}><i aria-hidden="true"/><small>{settings.theme==="dark"?"어둡게":"밝게"}</small></button></div><ReaderSettings value={settings} onChange={setSettings} onClose={closeDrawer} embedded/><button className="drawer-handle" onClick={closeDrawer} aria-label="위로 밀어 설정 닫기"><span/></button></div>
    <div className="reader-body">{sessionLoaded&&(settings.mode==="scroll"?<ScrollReader markdown={markdown} progress={progress} onProgress={updateProgress} restore={progress} onPageChange={onPageChange}/>:<PaginatedReader key={`${settings.fontSize}:${settings.lineHeight}:${settings.fontFamily}:${settings.width}`} markdown={markdown} progress={progress} bookmarks={bookmarks} onBookmarksChange={updateBookmarks} onProgress={updateProgress} onUiToggle={toggleDrawer} goToId={target} onPageChange={onPageChange}/>)}</div>
    <nav className="feature-toolbar" aria-label="Reader 메뉴"><Tool icon="back" label="뒤로" onClick={back}/><Tool icon="toc" label="목차" onClick={()=>{setPopover(null);setToc(value=>!value)}}/><Tool icon="share" label="공유" dataPopover="share" onClick={()=>togglePopover("share")}/><Tool icon="down" label="저장" dataPopover="save" onClick={()=>togglePopover("save")}/></nav>
    {toc&&<ReaderTableOfContents headings={headings} onSelect={selectHeading} onClose={()=>setToc(false)}/>} {popover==="share"&&<ReaderSharePanel title={title} onCreateShare={onCreateShare} onClose={()=>setPopover(null)}/>} {popover==="save"&&<ReaderSavePanel onMarkdown={downloadMarkdown} onPdf={printPdf} onCopy={copyText} onClose={()=>setPopover(null)}/>} {guide&&<ReaderGuidebook onBack={closeGuide}/>} {leaveConfirm&&<ReaderConfirmDialog onCancel={()=>setLeaveConfirm(false)} onConfirm={confirmBack}/>} {notice&&<div className="reader-notice" role="status">{notice}</div>} {printing&&<article className="print-document"><MarkdownRenderer markdown={markdown}/></article>}
  </main>;
}

function Tool({icon,label,onClick,dataPopover}:{icon:string;label:string;onClick:()=>void;dataPopover?:string}){return <button data-reader-popover={dataPopover} onClick={onClick}>{icon==="share"?<svg className="toolbar-share-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20v-2.5C4 12.8 7.6 9 13 9h6"/><path d="m14 4 5 5-5 5"/></svg>:<i className={`pixel-icon icon-${icon}`} aria-hidden="true"/>}<span>{label}</span></button>}
