"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type Book from "epubjs/types/book";
import type Contents from "epubjs/types/contents";
import type { Location, default as Rendition } from "epubjs/types/rendition";
import type { NavItem } from "epubjs/types/navigation";
import { useReaderSettings } from "@/hooks/useReaderSettings";
import type { HeadingItem } from "@/lib/markdown";
import ReaderConfirmDialog from "./ReaderConfirmDialog";
import ReaderGuidebook from "./ReaderGuidebook";
import ReaderSettings from "./ReaderSettings";
import ReaderTableOfContents from "./ReaderTableOfContents";

type Props={documentId:string;title:string;filename:string;data:ArrayBuffer;onBack:()=>void;onError:(message:string)=>void;onTitleChange:(title:string)=>void;onPageChange?:(current:number,total:number)=>void};
type StoredSession={cfi?:unknown;bookmarks?:unknown};
type TouchStart={x:number;y:number;t:number};
type TransitionDocument={startViewTransition?:(update:()=>void|Promise<void>)=>{finished:Promise<void>}};
type EpubFactory=(input?:string|ArrayBuffer)=>Book;
const DRAWER_GRAB_HEIGHT=72,DRAWER_TRIGGER_DISTANCE=56;

function flattenNavigation(items:NavItem[],level=1):HeadingItem[]{
  return items.flatMap(item=>[{id:item.href,text:item.label.trim()||"제목 없는 항목",level:Math.min(3,level)},...flattenNavigation(item.subitems||[],level+1)]);
}

function openBook(book:Book,data:ArrayBuffer){
  return new Promise<void>((resolve,reject)=>{
    const fail=(error?:unknown)=>{clearTimeout(timer);reject(error instanceof Error?error:new Error("Invalid EPUB"))};
    const timer=setTimeout(()=>fail(new Error("EPUB open timeout")),15_000);
    void book.open(data).then(()=>{clearTimeout(timer);resolve()},fail);
  });
}

export default function EpubReader({documentId,title,filename,data,onBack,onError,onTitleChange,onPageChange}:Props){
  const{settings,setSettings,ready}=useReaderSettings();
  const[toc,setToc]=useState(false),[drawer,setDrawer]=useState(false),[guide,setGuide]=useState(false),[leaveConfirm,setLeaveConfirm]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState("");
  const[headings,setHeadings]=useState<HeadingItem[]>([]),[currentCfi,setCurrentCfi]=useState(""),[locations,setLocations]=useState(0),[locationIndex,setLocationIndex]=useState(0),[bookmarks,setBookmarks]=useState<string[]>([]),[engineVersion,setEngineVersion]=useState(0);
  const readerNode=useRef<HTMLElement>(null),surface=useRef<HTMLDivElement>(null),bookRef=useRef<Book|null>(null),renditionRef=useRef<Rendition|null>(null),settingsRef=useRef(settings),cfiRef=useRef(""),touch=useRef<TouchStart|null>(null),animating=useRef(false),onErrorRef=useRef(onError),onTitleChangeRef=useRef(onTitleChange),onPageChangeRef=useRef(onPageChange);
  const pull=useRef<{y:number;closing:boolean}|null>(null),drawerDrag=useRef(0),drawerNode=useRef<HTMLDivElement>(null),drawerFrame=useRef<number|null>(null),scrubFrame=useRef<number|null>(null),pendingScrub=useRef<number|null>(null),themeAudio=useRef<HTMLAudioElement|null>(null),pageAudio=useRef<HTMLAudioElement|null>(null),noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  settingsRef.current=settings;cfiRef.current=currentCfi;onErrorRef.current=onError;onTitleChangeRef.current=onTitleChange;onPageChangeRef.current=onPageChange;
  const sessionKey=`epub-session:${documentId}`;

  const flash=useCallback((text:string)=>{if(noticeTimer.current)clearTimeout(noticeTimer.current);setNotice(text);noticeTimer.current=setTimeout(()=>setNotice(""),1900)},[]);
  const closeDrawer=useCallback(()=>setDrawer(false),[]);
  const toggleDrawer=useCallback(()=>{setToc(false);setDrawer(value=>!value)},[]);
  const openGuide=useCallback(()=>{setDrawer(false);setToc(false);history.pushState({...history.state,mdBooksGuide:true},"",location.href);setGuide(true)},[]);
  const closeGuide=useCallback(()=>{setGuide(false);if(history.state?.mdBooksGuide)history.back()},[]);
  const toggleGuide=useCallback(()=>guide?closeGuide():openGuide(),[closeGuide,guide,openGuide]);
  const toggleTheme=useCallback(()=>{const player=themeAudio.current;if(player){player.currentTime=0;void player.play().catch(()=>{})}setSettings(value=>({...value,theme:value.theme==="light"?"dark":"light"}))},[setSettings]);

  const updateLocation=useCallback((cfi:string)=>{
    const book=bookRef.current;
    if(!book||!cfi)return;
    setCurrentCfi(cfi);
    const count=book.locations.length();
    if(count>0){
      const rawIndex=Number(book.locations.locationFromCfi(cfi)),index=Number.isFinite(rawIndex)?Math.max(0,rawIndex):0;
      setLocations(count);setLocationIndex(index);onPageChangeRef.current?.(index+1,count);
    }
  },[]);

  const turn=useCallback(async(direction:"forward"|"backward")=>{
    const rendition=renditionRef.current;
    if(!rendition||animating.current||settingsRef.current.mode!=="page")return;
    animating.current=true;
    const player=pageAudio.current;if(player){player.currentTime=0;void player.play().catch(()=>{})}
    const update=()=>direction==="forward"?rendition.next():rendition.prev();
    const transitionDocument=document as unknown as TransitionDocument;
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.dataset.pageTurn=direction;
    const transition=!reduced?transitionDocument.startViewTransition?.call(document,update):undefined;
    if(transition)await transition.finished.catch(()=>{});else await update().catch(()=>{});
    delete document.documentElement.dataset.pageTurn;animating.current=false;
  },[]);

  useEffect(()=>{const themePlayer=new Audio("/lock.mp3"),turnPlayer=new Audio("/page.mp3");themePlayer.preload="auto";turnPlayer.preload="auto";themePlayer.volume=.5;turnPlayer.volume=.28;themePlayer.load();turnPlayer.load();themeAudio.current=themePlayer;pageAudio.current=turnPlayer;return()=>{themePlayer.pause();turnPlayer.pause();themeAudio.current=null;pageAudio.current=null;if(noticeTimer.current)clearTimeout(noticeTimer.current);if(scrubFrame.current!==null)cancelAnimationFrame(scrubFrame.current)}},[]);
  useEffect(()=>{const pop=(event:PopStateEvent)=>setGuide(Boolean(event.state?.mdBooksGuide));addEventListener("popstate",pop);return()=>removeEventListener("popstate",pop)},[]);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(sessionKey)||"{}") as StoredSession;if(typeof saved.cfi==="string")setCurrentCfi(saved.cfi);if(Array.isArray(saved.bookmarks))setBookmarks(saved.bookmarks.filter((item):item is string=>typeof item==="string"&&item.startsWith("epubcfi(")))}catch{}},[sessionKey]);
  useEffect(()=>{if(!currentCfi)return;const timer=setTimeout(()=>{try{localStorage.setItem(sessionKey,JSON.stringify({cfi:currentCfi,bookmarks,updatedAt:Date.now()}))}catch{}},180);return()=>clearTimeout(timer)},[bookmarks,currentCfi,sessionKey]);

  useEffect(()=>{
    if(!ready||!surface.current)return;
    let cancelled=false,locationTimer:ReturnType<typeof setTimeout>|null=null;
    const container=surface.current;
    let restoreCfi=cfiRef.current;
    try{const saved=JSON.parse(localStorage.getItem(sessionKey)||"{}") as StoredSession;if(typeof saved.cfi==="string")restoreCfi=saved.cfi}catch{}
    setLoading(true);setLocations(0);setLocationIndex(0);
    const open=async()=>{
      try{
        const imported=await import("epubjs"),candidate=imported.default as unknown;
        const ePub=(typeof candidate==="function"?candidate:(candidate as{default:EpubFactory}).default) as EpubFactory;
        if(cancelled)return;
        const book=ePub();bookRef.current=book;
        await openBook(book,data.slice(0));
        if(cancelled)return;
        const metadata=await book.loaded.metadata;
        const nextTitle=metadata.title?.trim();if(nextTitle)onTitleChangeRef.current(nextTitle);
        const navigation=await book.loaded.navigation;
        if(!cancelled)setHeadings(flattenNavigation(navigation.toc));
        const rendition=book.renderTo(container,{width:"100%",height:"100%",manager:settings.mode==="scroll"?"continuous":"default",flow:settings.mode==="scroll"?"scrolled-doc":"paginated",spread:"none",allowScriptedContent:false});
        renditionRef.current=rendition;
        const secureContents=(contents:Contents)=>{
          const doc=contents.document;
          doc.querySelectorAll("script,iframe,object,embed,form").forEach(node=>node.remove());
          doc.querySelectorAll('link[href^="http://"],link[href^="https://"],link[href^="//"]').forEach(node=>node.remove());
          doc.querySelectorAll<HTMLElement>('[src^="http://"],[src^="https://"],[src^="//"]').forEach(node=>node.removeAttribute("src"));
          doc.querySelectorAll<HTMLElement>("[srcset]").forEach(node=>node.removeAttribute("srcset"));
          const meta=doc.createElement("meta");meta.setAttribute("http-equiv","Content-Security-Policy");meta.setAttribute("content","default-src 'none'; img-src blob: data:; media-src blob: data:; font-src blob: data:; style-src 'unsafe-inline' blob: data:; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'");doc.head?.prepend(meta);
        };
        rendition.hooks.content.register(secureContents);
        rendition.themes.register("mdbooks-light",{"html, body":{background:"#eef0e7 !important",color:"#162527 !important"},"a":{color:"#31585d !important"},"img, svg":{"max-width":"100% !important",height:"auto !important"},"pre":{"max-width":"100% !important","overflow-x":"auto !important"}});
        rendition.themes.register("mdbooks-dark",{"html, body":{background:"#172224 !important",color:"#e6e9df !important"},"a":{color:"#b7d6d8 !important"},"img, svg":{"max-width":"100% !important",height:"auto !important"},"pre":{"max-width":"100% !important","overflow-x":"auto !important"}});
        const relocated=(next:Location)=>updateLocation(next.start.cfi);
        const touchStart=(event:TouchEvent)=>{const point=event.changedTouches[0];if(point)touch.current={x:point.clientX,y:point.clientY,t:performance.now()}};
        const touchEnd=(event:TouchEvent)=>{const start=touch.current,point=event.changedTouches[0];touch.current=null;if(!start||!point||settingsRef.current.mode!=="page")return;const dx=point.clientX-start.x,dy=point.clientY-start.y,velocity=Math.abs(dx)/Math.max(1,performance.now()-start.t);if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.15||velocity>.65&&Math.abs(dx)>24)void turn(dx<0?"forward":"backward")};
        const keydown=(event:KeyboardEvent)=>{if(event.key==="ArrowRight"||event.key==="PageDown"){event.preventDefault();void turn("forward")}else if(event.key==="ArrowLeft"||event.key==="PageUp"){event.preventDefault();void turn("backward")}};
        rendition.on("relocated",relocated);rendition.on("touchstart",touchStart);rendition.on("touchend",touchEnd);rendition.on("keydown",keydown);
        await rendition.display(restoreCfi||undefined);
        if(cancelled)return;
        setLoading(false);setEngineVersion(value=>value+1);
        locationTimer=setTimeout(()=>{void book.locations.generate(1400).then(()=>{if(cancelled)return;const count=book.locations.length();setLocations(count);if(cfiRef.current)updateLocation(cfiRef.current)}).catch(()=>{})},280);
      }catch{if(!cancelled)onErrorRef.current("이 파일은 열 수 없는 EPUB이거나 손상된 파일입니다.")}
    };
    void open();
    return()=>{cancelled=true;if(locationTimer)clearTimeout(locationTimer);const book=bookRef.current;renditionRef.current=null;bookRef.current=null;book?.destroy();container.replaceChildren()};
  },[data,documentId,ready,sessionKey,settings.mode,turn,updateLocation]);

  useEffect(()=>{
    const rendition=renditionRef.current;if(!rendition||!engineVersion)return;
    rendition.themes.select(settings.theme==="dark"?"mdbooks-dark":"mdbooks-light");
    rendition.themes.fontSize(`${settings.fontSize}px`);
    rendition.themes.font(settings.fontFamily==="serif"?'"Noto Serif KR", "Nanum Myeongjo", Batang, Georgia, serif':'"Pretendard", "Noto Sans KR", system-ui, sans-serif');
    rendition.themes.override("line-height",String(settings.lineHeight),true);
    rendition.themes.override("max-width",{narrow:"640px",default:"720px",wide:"800px"}[settings.width],true);
    rendition.themes.override("margin","0 auto",true);
    rendition.themes.override("padding","22px",true);
    rendition.themes.override("box-sizing","border-box",true);
  },[engineVersion,settings]);

  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(/INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName))return;if(event.key==="ArrowRight"||event.key==="PageDown"){event.preventDefault();void turn("forward")}else if(event.key==="ArrowLeft"||event.key==="PageUp"){event.preventDefault();void turn("backward")}};addEventListener("keydown",key);return()=>removeEventListener("keydown",key)},[turn]);

  const selectHeading=(href:string)=>{setToc(false);void renditionRef.current?.display(href)};
  const scrubTo=(index:number)=>{pendingScrub.current=index;if(scrubFrame.current!==null)return;scrubFrame.current=requestAnimationFrame(()=>{scrubFrame.current=null;const next=pendingScrub.current;pendingScrub.current=null;if(next===null)return;const cfi=bookRef.current?.locations.cfiFromLocation(next);if(typeof cfi==="string")void renditionRef.current?.display(cfi)})};
  const bookmarkLocations=bookmarks.flatMap(cfi=>{const index=Number(bookRef.current?.locations.locationFromCfi(cfi)??-1);return index>=0?[index]:[]});
  const bookmarked=bookmarks.includes(currentCfi);
  const toggleBookmark=()=>{if(!currentCfi)return;setBookmarks(value=>value.includes(currentCfi)?value.filter(item=>item!==currentCfi):[...value,currentCfi])};
  const download=()=>{const url=URL.createObjectURL(new Blob([data],{type:"application/epub+zip"}));const anchor=document.createElement("a");anchor.href=url;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),0);flash("EPUB 저장을 시작했습니다.")};
  const pullDown=(event:React.PointerEvent)=>{const source=event.target as HTMLElement,handle=source.closest(".drawer-handle");if(source.closest("button,input")&&!handle)return;if(drawer&&!handle)return;const top=readerNode.current?.getBoundingClientRect().top??0;if(!drawer&&event.clientY-top>DRAWER_GRAB_HEIGHT)return;pull.current={y:event.clientY,closing:drawer};drawerNode.current?.classList.add("is-dragging");event.currentTarget.setPointerCapture(event.pointerId)};
  const pullMove=(event:React.PointerEvent)=>{if(!pull.current)return;const dy=event.clientY-pull.current.y,height=drawerNode.current?.offsetHeight??520;drawerDrag.current=pull.current.closing?Math.min(0,Math.max(-height,dy)):Math.min(height,Math.max(0,dy));if(drawerFrame.current!==null)return;drawerFrame.current=requestAnimationFrame(()=>{if(drawerNode.current)drawerNode.current.style.transform=pull.current?.closing?`translateY(${drawerDrag.current}px)`:`translateY(calc(-100% + ${drawerDrag.current}px))`;drawerFrame.current=null})};
  const pullEnd=()=>{if(pull.current?.closing&&drawerDrag.current<-DRAWER_TRIGGER_DISTANCE)setDrawer(false);else if(!pull.current?.closing&&drawerDrag.current>DRAWER_TRIGGER_DISTANCE)setDrawer(true);drawerDrag.current=0;if(drawerFrame.current!==null)cancelAnimationFrame(drawerFrame.current);drawerFrame.current=null;if(drawerNode.current){drawerNode.current.classList.remove("is-dragging");drawerNode.current.style.transform=""}pull.current=null};

  const progress=locations>1?locationIndex/(locations-1)*100:0;
  return <main ref={readerNode} className={`novel-reader epub-reader theme-${settings.theme} font-${settings.fontFamily} mode-${settings.mode}`} onPointerDown={pullDown} onPointerMove={pullMove} onPointerUp={pullEnd} onPointerCancel={pullEnd}>
    <div className="reader-status"><span className="status-grip" aria-hidden="true"/><strong>{guide?"MD북스 도움말":title}</strong><button className="reader-help" onClick={toggleGuide} aria-label={guide?"MD북스 도움말 닫기":"MD북스 도움말 열기"} aria-expanded={guide}><i className="pixel-icon icon-help" aria-hidden="true">?</i></button></div>
    <div ref={drawerNode} className={`quick-drawer ${drawer?"is-open":""}`}><div className="brightness-row"><button className={`epaper-theme ${settings.theme==="dark"?"is-moon":"is-sun"}`} onClick={toggleTheme} aria-label={settings.theme==="dark"?"밝은 화면으로 전환":"어두운 화면으로 전환"}><i aria-hidden="true"/><small>{settings.theme==="dark"?"어둡게":"밝게"}</small></button></div><ReaderSettings value={settings} onChange={setSettings} onClose={closeDrawer} embedded/><button className="drawer-handle" onClick={closeDrawer} aria-label="위로 밀어 설정 닫기"><span/></button></div>
    <div ref={surface} className="epub-surface" onDoubleClick={toggleDrawer}/>{loading&&<div className="epub-loading" role="status"><strong>EPUB 여는 중</strong><span>책의 구성과 목차를 확인하고 있습니다.</span></div>}
    <div className="page-navigation epub-navigation" onPointerDown={event=>event.stopPropagation()}><div className="page-indicator"><span className="epub-location-label">{locations?`${locationIndex+1} / ${locations}`:"위치 계산 중"}</span><button className={`bookmark-toggle ${bookmarked?"is-active":""}`} onClick={toggleBookmark} disabled={!currentCfi} aria-label={bookmarked?"현재 위치 북마크 해제":"현재 위치 북마크"} aria-pressed={bookmarked}><i aria-hidden="true"/></button></div><div className="scrubber-bookmarks" aria-hidden="true">{bookmarkLocations.map((index,key)=><i key={`${index}-${key}`} style={{"--bookmark-position":`${locations>1?index/(locations-1)*100:0}%`} as CSSProperties}/>)}</div><input className="page-scrubber" type="range" min={0} max={Math.max(0,locations-1)} step={1} value={Math.min(locationIndex,Math.max(0,locations-1))} disabled={!locations} onChange={event=>scrubTo(Number(event.target.value))} style={{"--page-progress":`${progress}%`} as CSSProperties} aria-label={`EPUB 빠른 탐색, 현재 위치 ${locationIndex+1}`}/></div>
    <nav className="feature-toolbar" aria-label="EPUB Reader 메뉴"><Tool icon="back" label="뒤로" onClick={()=>setLeaveConfirm(true)}/><Tool icon="toc" label="목차" onClick={()=>setToc(value=>!value)}/><Tool icon="share" label="공유" onClick={()=>flash("EPUB은 이 기기에서만 읽을 수 있습니다.")}/><Tool icon="down" label="저장" onClick={download}/></nav>
    {toc&&<ReaderTableOfContents headings={headings} onSelect={selectHeading} onClose={()=>setToc(false)}/>} {guide&&<ReaderGuidebook onBack={closeGuide}/>} {leaveConfirm&&<ReaderConfirmDialog onCancel={()=>setLeaveConfirm(false)} onConfirm={onBack}/>} {notice&&<div className="reader-notice" role="status">{notice}</div>}
  </main>;
}

function Tool({icon,label,onClick}:{icon:string;label:string;onClick:()=>void}){return <button onClick={onClick}>{icon==="share"?<svg className="toolbar-share-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20v-2.5C4 12.8 7.6 9 13 9h6"/><path d="m14 4 5 5-5 5"/></svg>:<i className={`pixel-icon icon-${icon}`} aria-hidden="true"/>}<span>{label}</span></button>}
