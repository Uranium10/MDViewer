"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

type Props={markdown:string;progress:number;onProgress:(n:number)=>void;onUiToggle:()=>void;goToId:string|null};
type Gesture={x:number;y:number;t:number;horizontal?:boolean};
type TransitionDocument={startViewTransition?:(update:()=>void)=>{finished:Promise<void>}};

export default function PaginatedReader({markdown,progress,onProgress,onUiToggle,goToId}:Props){
  const viewport=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null);
  const gesture=useRef<Gesture|null>(null),animating=useRef(false);
  const pageRef=useRef(0),pagesRef=useRef(1),progressRef=useRef(progress),onProgressRef=useRef(onProgress),audio=useRef<HTMLAudioElement|null>(null);
  const [pages,setPages]=useState(1),[page,setPage]=useState(0);
  progressRef.current=progress;onProgressRef.current=onProgress;

  const setPosition=useCallback((next:number,report=true)=>{const view=viewport.current;if(!view)return;const clamped=Math.max(0,Math.min(pagesRef.current-1,next));pageRef.current=clamped;view.scrollLeft=clamped*view.clientWidth;setPage(old=>old===clamped?old:clamped);if(report)onProgressRef.current(pagesRef.current>1?clamped/(pagesRef.current-1):0)},[]);
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
  useLayoutEffect(()=>{let frame:number|null=null;const schedule=()=>{if(frame!==null)return;frame=requestAnimationFrame(()=>{frame=null;measure()})};schedule();const observer=new ResizeObserver(schedule);if(viewport.current)observer.observe(viewport.current);if(content.current)observer.observe(content.current);void document.fonts?.ready.then(schedule);return()=>{observer.disconnect();if(frame!==null)cancelAnimationFrame(frame)}},[markdown,measure]);
  useEffect(()=>{const player=new Audio("/page.mp3");player.preload="auto";player.volume=.28;player.load();audio.current=player;return()=>{player.pause();audio.current=null}},[]);
  useEffect(()=>{if(!goToId||!content.current||!viewport.current)return;const el=content.current.querySelector(`#${CSS.escape(goToId)}`) as HTMLElement|null;if(el)setPosition(Math.floor(el.offsetLeft/viewport.current.clientWidth))},[goToId,pages,setPosition]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)||animating.current)return;if(e.key==="ArrowRight"||e.key==="PageDown"){e.preventDefault();turn(pageRef.current+1,false)}else if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();turn(pageRef.current-1,true)}};addEventListener("keydown",key);return()=>removeEventListener("keydown",key)},[turn]);

  const down=(e:React.PointerEvent)=>{if(animating.current||(e.target as HTMLElement).closest("a,button,input,textarea,[role=dialog]")||getSelection()?.toString())return;gesture.current={x:e.clientX,y:e.clientY,t:performance.now()};e.currentTarget.setPointerCapture(e.pointerId)};
  const pointerMove=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(g.horizontal===undefined&&Math.max(Math.abs(dx),Math.abs(dy))>8)g.horizontal=Math.abs(dx)>Math.abs(dy);if(g.horizontal)e.preventDefault()};
  const finish=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,velocity=Math.abs(dx)/Math.max(1,performance.now()-g.t),fromLeft=dx>0;const commit=g.horizontal&&(Math.abs(dx)>e.currentTarget.clientWidth*.2||velocity>.65);if(commit)turn(pageRef.current+(dx<0?1:-1),fromLeft);else if(!g.horizontal&&Math.abs(dx)<8&&Math.abs(e.clientY-g.y)<8){const ratio=e.clientX/e.currentTarget.clientWidth;if(ratio<.25)turn(pageRef.current-1,true);else if(ratio>.75)turn(pageRef.current+1,false);else onUiToggle()}gesture.current=null};

  return <div className="page-reader"><div className="page-paper" onPointerDown={down} onPointerMove={pointerMove} onPointerUp={finish} onPointerCancel={finish}><div className="page-viewport" ref={viewport}><div ref={content} className="page-columns"><MarkdownRenderer markdown={markdown}/></div></div><div className="page-number" aria-live="polite">{page+1} / {pages}</div></div></div>;
}
