"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

type Props={markdown:string;progress:number;onProgress:(n:number)=>void;onUiToggle:()=>void;goToId:string|null};
type Gesture={x:number;y:number;t:number;horizontal?:boolean};

export default function PaginatedReader({markdown,progress,onProgress,onUiToggle,goToId}:Props){
  const viewport=useRef<HTMLDivElement>(null);
  const content=useRef<HTMLDivElement>(null);
  const gesture=useRef<Gesture|null>(null);
  const drag=useRef(0);
  const raf=useRef<number|null>(null);
  const pageRef=useRef(0);
  const pagesRef=useRef(1);
  const progressRef=useRef(progress);
  const onProgressRef=useRef(onProgress);
  const [pages,setPages]=useState(1);
  const [page,setPage]=useState(0);
  const [curl,setCurl]=useState<{frame:number;left:boolean}>({frame:0,left:false});

  progressRef.current=progress;
  onProgressRef.current=onProgress;

  const paint=useCallback((offset=drag.current,animate=false)=>{
    if(raf.current!==null)cancelAnimationFrame(raf.current);
    raf.current=requestAnimationFrame(()=>{
      const view=viewport.current;
      if(!view)return;
      view.scrollTo({left:(pageRef.current*view.clientWidth)-offset,behavior:animate?"smooth":"auto"});
      raf.current=null;
    });
  },[]);

  const measure=useCallback(()=>{
    const view=viewport.current,node=content.current;
    if(!view||!node||!view.clientWidth)return;
    const count=Math.max(1,Math.round(node.scrollWidth/view.clientWidth));
    const next=Math.min(count-1,Math.round(progressRef.current*Math.max(0,count-1)));
    pagesRef.current=count;pageRef.current=next;
    setPages(old=>old===count?old:count);
    setPage(old=>old===next?old:next);
    paint(0,false);
  },[paint]);

  useLayoutEffect(()=>{
    let measureFrame:number|null=null;
    const schedule=()=>{if(measureFrame!==null)return;measureFrame=requestAnimationFrame(()=>{measureFrame=null;measure()})};
    schedule();
    const observer=new ResizeObserver(schedule);
    if(viewport.current)observer.observe(viewport.current);
    if(content.current)observer.observe(content.current);
    void document.fonts?.ready.then(schedule);
    return()=>{observer.disconnect();if(measureFrame!==null)cancelAnimationFrame(measureFrame);if(raf.current!==null)cancelAnimationFrame(raf.current)};
  },[markdown,measure]);

  const move=useCallback((next:number)=>{
    const clamped=Math.max(0,Math.min(pagesRef.current-1,next));
    if(clamped===pageRef.current){drag.current=0;paint(0,true);return;}
    const nearby=Math.abs(clamped-pageRef.current)<=1;
    pageRef.current=clamped;setPage(clamped);drag.current=0;paint(0,nearby);
    onProgressRef.current(pagesRef.current>1?clamped/(pagesRef.current-1):0);
  },[paint]);

  useEffect(()=>{if(!goToId||!content.current||!viewport.current)return;const el=content.current.querySelector(`#${CSS.escape(goToId)}`) as HTMLElement|null;if(el)move(Math.floor(el.offsetLeft/viewport.current.clientWidth))},[goToId,move,pages]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName))return;if(e.key==="ArrowRight"||e.key==="PageDown"){e.preventDefault();move(pageRef.current+1)}else if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();move(pageRef.current-1)}};addEventListener("keydown",key);return()=>removeEventListener("keydown",key)},[move]);

  const down=(e:React.PointerEvent)=>{if((e.target as HTMLElement).closest("a,button,input,textarea,[role=dialog]")||getSelection()?.toString())return;gesture.current={x:e.clientX,y:e.clientY,t:performance.now()};e.currentTarget.setPointerCapture(e.pointerId)};
  const pointerMove=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(g.horizontal===undefined&&Math.max(Math.abs(dx),Math.abs(dy))>8)g.horizontal=Math.abs(dx)>Math.abs(dy);if(!g.horizontal)return;e.preventDefault();const width=e.currentTarget.clientWidth;drag.current=Math.max(-width*.72,Math.min(width*.72,dx));paint();const frame=Math.min(5,Math.max(1,Math.ceil(Math.abs(drag.current)/width*6)));setCurl(old=>old.frame===frame&&old.left===(drag.current>0)?old:{frame,left:drag.current>0})};
  const finish=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,velocity=Math.abs(dx)/Math.max(1,performance.now()-g.t);if(g.horizontal&&(Math.abs(dx)>e.currentTarget.clientWidth*.18||velocity>.65))move(pageRef.current+(dx<0?1:-1));else if(!g.horizontal&&Math.abs(dx)<8&&Math.abs(e.clientY-g.y)<8){const ratio=e.clientX/e.currentTarget.clientWidth;if(ratio<.25)move(pageRef.current-1);else if(ratio>.75)move(pageRef.current+1);else onUiToggle()}else{drag.current=0;paint(0,true)}setCurl({frame:0,left:false});gesture.current=null};

  return <div className="page-reader">
    <div className="page-viewport" ref={viewport} onPointerDown={down} onPointerMove={pointerMove} onPointerUp={finish} onPointerCancel={finish}>
      <div ref={content} className="page-columns"><MarkdownRenderer markdown={markdown}/></div>
    </div>
    {curl.frame>0&&<div className={`page-curl frame-${curl.frame} ${curl.left?"from-left":"from-right"}`} aria-hidden="true"><i/><b/></div>}
    <div className="page-number" aria-live="polite">{page+1} / {pages}</div>
  </div>;
}
