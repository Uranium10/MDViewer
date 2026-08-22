"use client";
import { useCallback,useEffect,useLayoutEffect,useRef,useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
type Props={markdown:string;progress:number;onProgress:(n:number)=>void;onUiToggle:()=>void;goToId:string|null};
export default function PaginatedReader({markdown,progress,onProgress,onUiToggle,goToId}:Props){
 const viewport=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null);const[pages,setPages]=useState(1),[page,setPage]=useState(0),[drag,setDrag]=useState(0);const gesture=useRef<{x:number;y:number;t:number;horizontal?:boolean}|null>(null);
 const measure=useCallback(()=>{const v=viewport.current,c=content.current;if(!v||!c||!v.clientWidth)return;const count=Math.max(1,Math.round(c.scrollWidth/v.clientWidth));setPages(count);setPage(Math.min(count-1,Math.round(progress*Math.max(0,count-1))))},[progress]);
 useLayoutEffect(()=>{measure();const observer=new ResizeObserver(measure);if(viewport.current)observer.observe(viewport.current);if(content.current)observer.observe(content.current);document.fonts?.ready.then(measure);return()=>observer.disconnect()},[markdown,measure]);
 useEffect(()=>{if(!goToId||!content.current||!viewport.current)return;const el=content.current.querySelector(`#${CSS.escape(goToId)}`) as HTMLElement|null;if(el){const next=Math.max(0,Math.min(pages-1,Math.floor(el.offsetLeft/viewport.current.clientWidth)));setPage(next);onProgress(pages>1?next/(pages-1):0)}},[goToId,pages,onProgress]);
 const move=useCallback((next:number)=>{const clamped=Math.max(0,Math.min(pages-1,next));setPage(clamped);onProgress(pages>1?clamped/(pages-1):0)},[pages,onProgress]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName))return;if(e.key==="ArrowRight"||e.key==="PageDown"){e.preventDefault();move(page+1)}if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();move(page-1)}};addEventListener("keydown",key);return()=>removeEventListener("keydown",key)},[move,page]);
 const down=(e:React.PointerEvent)=>{if((e.target as HTMLElement).closest("a,button,input,textarea,[role=dialog]")||getSelection()?.toString())return;gesture.current={x:e.clientX,y:e.clientY,t:performance.now()};e.currentTarget.setPointerCapture(e.pointerId)};
 const pointerMove=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(g.horizontal===undefined&&Math.max(Math.abs(dx),Math.abs(dy))>8)g.horizontal=Math.abs(dx)>Math.abs(dy);if(g.horizontal){e.preventDefault();setDrag(Math.max(-e.currentTarget.clientWidth*.72,Math.min(e.currentTarget.clientWidth*.72,dx)))}};
 const up=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,velocity=Math.abs(dx)/(performance.now()-g.t);if(g.horizontal&&(Math.abs(dx)>e.currentTarget.clientWidth*.18||velocity>.65))move(page+(dx<0?1:-1));else if(!g.horizontal&&Math.abs(dx)<8&&Math.abs(e.clientY-g.y)<8){const ratio=e.clientX/e.currentTarget.clientWidth;if(ratio<.25)move(page-1);else if(ratio>.75)move(page+1);else onUiToggle()}setDrag(0);gesture.current=null};
 const width=viewport.current?.clientWidth||1;const curlFrame=drag?Math.min(5,Math.max(1,Math.ceil(Math.abs(drag)/width*6))):0;
 return <div className="page-reader" ref={viewport} onPointerDown={down} onPointerMove={pointerMove} onPointerUp={up} onPointerCancel={()=>{setDrag(0);gesture.current=null}}>
  <div ref={content} className={`page-columns ${drag?"dragging":""}`} style={{transform:`translate3d(calc(${-page*100}% + ${drag}px),0,0)`}}><MarkdownRenderer markdown={markdown}/></div>
  {curlFrame>0&&<div className={`page-curl frame-${curlFrame} ${drag>0?"from-left":"from-right"}`} aria-hidden="true"><i/><b/></div>}
  <div className="page-number" aria-live="polite">{page+1} / {pages}</div>
 </div>
}
