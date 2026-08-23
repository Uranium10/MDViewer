"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

type Props={markdown:string;progress:number;bookmarks:number[];onBookmarksChange:(next:number[])=>void;onProgress:(n:number)=>void;onUiToggle:()=>void;goToId:string|null;onPageChange?:(current:number,total:number)=>void};
type Gesture={x:number;y:number;t:number;horizontal?:boolean};
type TransitionDocument={startViewTransition?:(update:()=>void)=>{finished:Promise<void>}};

export default function PaginatedReader({markdown,progress,bookmarks,onBookmarksChange,onProgress,onUiToggle,goToId,onPageChange}:Props){
  const viewport=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null);
  const gesture=useRef<Gesture|null>(null),animating=useRef(false);
  const pageRef=useRef(0),pagesRef=useRef(1),progressRef=useRef(progress),onProgressRef=useRef(onProgress),onPageChangeRef=useRef(onPageChange),audio=useRef<HTMLAudioElement|null>(null);
  const scrubFrame=useRef<number|null>(null),pendingScrub=useRef<number|null>(null),pageInput=useRef<HTMLInputElement>(null),cancelEdit=useRef(false),coarsePointer=useRef(false);
  const [pages,setPages]=useState(1),[page,setPage]=useState(0),[editingPage,setEditingPage]=useState(false),[pageDraft,setPageDraft]=useState("1"),[scrubbing,setScrubbing]=useState(false);
  progressRef.current=progress;onProgressRef.current=onProgress;onPageChangeRef.current=onPageChange;

  const setPosition=useCallback((next:number,report=true)=>{const view=viewport.current;if(!view)return;const clamped=Math.max(0,Math.min(pagesRef.current-1,next));pageRef.current=clamped;view.scrollLeft=clamped*view.clientWidth;setPage(old=>old===clamped?old:clamped);onPageChangeRef.current?.(clamped+1,pagesRef.current);if(report)onProgressRef.current(pagesRef.current>1?clamped/(pagesRef.current-1):0)},[]);
  const playSound=useCallback(()=>{const player=audio.current;if(!player)return;player.currentTime=0;void player.play().catch(()=>{})},[]);

  const runSnapshotTransition=useCallback((next:number,fromLeft:boolean)=>{
    const transitionDocument=document as unknown as TransitionDocument;
    playSound();
    document.documentElement.dataset.pageTurn=fromLeft?"backward":"forward";
    const transition=transitionDocument.startViewTransition?.call(document,()=>setPosition(next));
    if(!transition){delete document.documentElement.dataset.pageTurn;setPosition(next);animating.current=false;return}
    void transition.finished.finally(()=>{delete document.documentElement.dataset.pageTurn;animating.current=false});
  },[playSound,setPosition]);
  const turn=useCallback((next:number,fromLeft:boolean)=>{
    const clamped=Math.max(0,Math.min(pagesRef.current-1,next));
    if(clamped===pageRef.current)return;
    const transitionDocument=document as unknown as TransitionDocument;
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(typeof transitionDocument.startViewTransition==="function"&&!reduced){
      animating.current=true;
      runSnapshotTransition(clamped,fromLeft);
      return;
    }
    playSound();setPosition(clamped);
  },[playSound,runSnapshotTransition,setPosition]);

  const measure=useCallback(()=>{const view=viewport.current,node=content.current;if(!view||!node||!view.clientWidth)return;const count=Math.max(1,Math.round(node.scrollWidth/view.clientWidth));const next=Math.min(count-1,Math.round(progressRef.current*Math.max(0,count-1)));pagesRef.current=count;setPages(old=>old===count?old:count);setPosition(next,false)},[setPosition]);
  useLayoutEffect(()=>{let frame:number|null=null;const schedule=()=>{if(frame!==null)return;frame=requestAnimationFrame(()=>{frame=null;measure()})};schedule();const observer=new ResizeObserver(schedule);if(viewport.current)observer.observe(viewport.current);if(content.current)observer.observe(content.current);void document.fonts?.ready.then(schedule);return()=>{observer.disconnect();if(frame!==null)cancelAnimationFrame(frame);if(scrubFrame.current!==null)cancelAnimationFrame(scrubFrame.current)}},[markdown,measure]);
  useEffect(()=>{const player=new Audio("/page.mp3");player.preload="auto";player.volume=.28;player.load();audio.current=player;return()=>{player.pause();audio.current=null}},[]);
  useEffect(()=>{coarsePointer.current=matchMedia("(pointer: coarse)").matches},[]);
  useEffect(()=>{if(!goToId||!content.current||!viewport.current)return;const el=content.current.querySelector(`#${CSS.escape(goToId)}`) as HTMLElement|null;if(el)setPosition(Math.floor(el.offsetLeft/viewport.current.clientWidth))},[goToId,pages,setPosition]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)||animating.current)return;if(e.key==="ArrowRight"||e.key==="PageDown"){e.preventDefault();turn(pageRef.current+1,false)}else if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();turn(pageRef.current-1,true)}};addEventListener("keydown",key);return()=>removeEventListener("keydown",key)},[turn]);
  useEffect(()=>{if(!editingPage)return;const frame=requestAnimationFrame(()=>pageInput.current?.select());return()=>cancelAnimationFrame(frame)},[editingPage]);

  const scrubTo=(next:number)=>{let target=next;if(coarsePointer.current&&bookmarks.length){const bookmarkPages=bookmarks.map(mark=>Math.round(mark*Math.max(0,pagesRef.current-1))),nearest=bookmarkPages.reduce((best,item)=>Math.abs(item-next)<Math.abs(best-next)?item:best,bookmarkPages[0]),snapDistance=Math.max(1,Math.min(3,Math.round(pagesRef.current*.025)));if(Math.abs(nearest-next)<=snapDistance)target=nearest}pendingScrub.current=target;if(scrubFrame.current!==null)return;scrubFrame.current=requestAnimationFrame(()=>{scrubFrame.current=null;const pending=pendingScrub.current;pendingScrub.current=null;if(pending!==null)setPosition(pending)})};
  const flushScrub=()=>{if(scrubFrame.current!==null){cancelAnimationFrame(scrubFrame.current);scrubFrame.current=null}const pending=pendingScrub.current;pendingScrub.current=null;if(pending!==null)setPosition(pending)};
  const finishScrub=()=>{flushScrub();setScrubbing(false)};
  const beginPageEdit=()=>{cancelEdit.current=false;setPageDraft(String(pageRef.current+1));setEditingPage(true)};
  const commitPageEdit=()=>{if(cancelEdit.current){cancelEdit.current=false;return}setEditingPage(false);const requested=Number.parseInt(pageDraft,10);if(!Number.isFinite(requested))return;const target=Math.max(0,Math.min(pagesRef.current-1,requested-1));turn(target,target<pageRef.current)};
  const submitPageEdit=(e:FormEvent)=>{e.preventDefault();pageInput.current?.blur()};

  const down=(e:React.PointerEvent)=>{if(animating.current||(e.target as HTMLElement).closest("a,button,input,textarea,[role=dialog]")||getSelection()?.toString())return;gesture.current={x:e.clientX,y:e.clientY,t:performance.now()};e.currentTarget.setPointerCapture(e.pointerId)};
  const pointerMove=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(g.horizontal===undefined&&Math.max(Math.abs(dx),Math.abs(dy))>8)g.horizontal=Math.abs(dx)>Math.abs(dy);if(g.horizontal)e.preventDefault()};
  const finish=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,velocity=Math.abs(dx)/Math.max(1,performance.now()-g.t),fromLeft=dx>0;const commit=g.horizontal&&(Math.abs(dx)>e.currentTarget.clientWidth*.2||velocity>.65);if(commit)turn(pageRef.current+(dx<0?1:-1),fromLeft);else if(!g.horizontal&&Math.abs(dx)<8&&Math.abs(e.clientY-g.y)<8){const ratio=e.clientX/e.currentTarget.clientWidth;if(ratio<.25)turn(pageRef.current-1,true);else if(ratio>.75)turn(pageRef.current+1,false);else onUiToggle()}gesture.current=null};

  const progressPercent=pages>1?page/(pages-1)*100:0;
  const isBookmarked=bookmarks.some(mark=>Math.round(mark*Math.max(0,pages-1))===page);
  const toggleBookmark=()=>{const remaining=bookmarks.filter(mark=>Math.round(mark*Math.max(0,pages-1))!==page);onBookmarksChange(isBookmarked?remaining:[...remaining,pages>1?page/(pages-1):0])};
  return <div className="page-reader"><div className="page-paper" onPointerDown={down} onPointerMove={pointerMove} onPointerUp={finish} onPointerCancel={finish}><div className="page-viewport" ref={viewport}><div ref={content} className="page-columns"><MarkdownRenderer markdown={markdown}/></div></div></div><div className={`page-navigation ${scrubbing?"is-scrubbing":""}`} onPointerDown={e=>e.stopPropagation()}><div className="page-indicator">{editingPage?<form className="page-number-editor" onSubmit={submitPageEdit}><input ref={pageInput} type="number" inputMode="numeric" min={1} max={pages} value={pageDraft} onChange={e=>setPageDraft(e.target.value)} onBlur={commitPageEdit} onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();cancelEdit.current=true;setEditingPage(false)}}} aria-label={`이동할 페이지, 전체 ${pages}페이지`}/><span>/ {pages}</span></form>:<button className="page-number-button" onClick={beginPageEdit} aria-label={`현재 ${page+1}페이지, 전체 ${pages}페이지. 페이지 입력`}>{page+1} / {pages}</button>}<button className={`bookmark-toggle ${isBookmarked?"is-active":""}`} onClick={toggleBookmark} aria-label={isBookmarked?"현재 페이지 북마크 해제":"현재 페이지 북마크"} aria-pressed={isBookmarked}><i aria-hidden="true"/></button></div><div className="scrubber-bookmarks" aria-hidden="true">{bookmarks.map((mark,index)=>{const bookmarkPage=Math.round(mark*Math.max(0,pages-1)),position=Math.min(98.5,Math.max(1.5,mark*100));return <i key={`${mark}-${index}`} className={scrubbing&&bookmarkPage===page?"is-current":""} style={{"--bookmark-position":`${position}%`} as CSSProperties}/>})}</div><input className="page-scrubber" type="range" min={0} max={Math.max(0,pages-1)} step={1} value={page} onChange={e=>scrubTo(Number(e.target.value))} onPointerDown={()=>setScrubbing(true)} onPointerUp={finishScrub} onPointerCancel={finishScrub} onFocus={()=>setScrubbing(true)} onBlur={finishScrub} onKeyDown={()=>setScrubbing(true)} onKeyUp={()=>{flushScrub();setScrubbing(false)}} style={{"--page-progress":`${progressPercent}%`} as CSSProperties} aria-label={`페이지 빠른 탐색, 현재 ${page+1}페이지`}/></div></div>;
}
