"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

type Props={markdown:string;progress:number;onProgress:(n:number)=>void;onUiToggle:()=>void;goToId:string|null};
type Gesture={x:number;y:number;t:number;horizontal?:boolean};

export default function PaginatedReader({markdown,progress,onProgress,onUiToggle,goToId}:Props){
  const viewport=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null),effect=useRef<HTMLDivElement>(null);
  const gesture=useRef<Gesture|null>(null),animation=useRef<number|null>(null),animating=useRef(false),dragProgress=useRef(0);
  const pageRef=useRef(0),pagesRef=useRef(1),progressRef=useRef(progress),onProgressRef=useRef(onProgress),audio=useRef<HTMLAudioElement|null>(null);
  const [pages,setPages]=useState(1),[page,setPage]=useState(0);
  progressRef.current=progress;onProgressRef.current=onProgress;

  const showEffect=useCallback((amount:number,fromLeft:boolean)=>{const node=effect.current;if(!node)return;const value=Math.max(0,Math.min(1,amount));node.classList.toggle("from-left",fromLeft);node.classList.toggle("from-right",!fromLeft);node.style.setProperty("--turn",String(value));node.style.opacity=value>.002?"1":"0"},[]);
  const setPosition=useCallback((next:number,report=true)=>{const view=viewport.current;if(!view)return;const clamped=Math.max(0,Math.min(pagesRef.current-1,next));pageRef.current=clamped;view.scrollLeft=clamped*view.clientWidth;setPage(old=>old===clamped?old:clamped);if(report)onProgressRef.current(pagesRef.current>1?clamped/(pagesRef.current-1):0)},[]);
  const playSound=useCallback(()=>{const player=audio.current;if(!player)return;player.currentTime=0;void player.play().catch(()=>{})},[]);

  const settle=useCallback((to:number,fromLeft:boolean,nextPage:number|null)=>{if(animation.current!==null)cancelAnimationFrame(animation.current);const from=dragProgress.current;const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;if(nextPage!==null)playSound();if(reduced){if(nextPage!==null)setPosition(nextPage);showEffect(0,fromLeft);dragProgress.current=0;animating.current=false;return}animating.current=true;const started=performance.now(),duration=nextPage===null?120:210;let switched=false;const tick=(now:number)=>{const ratio=Math.min(1,(now-started)/duration);const eased=1-Math.pow(1-ratio,3);const value=from+(to-from)*eased;showEffect(value,fromLeft);if(nextPage!==null&&!switched&&value>=.58){switched=true;setPosition(nextPage)}if(ratio<1)animation.current=requestAnimationFrame(tick);else{showEffect(0,fromLeft);dragProgress.current=0;animating.current=false;animation.current=null}};animation.current=requestAnimationFrame(tick)},[playSound,setPosition,showEffect]);
  const turn=useCallback((next:number,fromLeft:boolean,start=0)=>{const clamped=Math.max(0,Math.min(pagesRef.current-1,next));dragProgress.current=start;if(clamped===pageRef.current){settle(0,fromLeft,null);return}showEffect(Math.max(.025,start),fromLeft);settle(1,fromLeft,clamped)},[settle,showEffect]);

  const measure=useCallback(()=>{const view=viewport.current,node=content.current;if(!view||!node||!view.clientWidth)return;const count=Math.max(1,Math.round(node.scrollWidth/view.clientWidth));const next=Math.min(count-1,Math.round(progressRef.current*Math.max(0,count-1)));pagesRef.current=count;setPages(old=>old===count?old:count);setPosition(next,false)},[setPosition]);
  useLayoutEffect(()=>{let frame:number|null=null;const schedule=()=>{if(frame!==null)return;frame=requestAnimationFrame(()=>{frame=null;measure()})};schedule();const observer=new ResizeObserver(schedule);if(viewport.current)observer.observe(viewport.current);if(content.current)observer.observe(content.current);void document.fonts?.ready.then(schedule);return()=>{observer.disconnect();if(frame!==null)cancelAnimationFrame(frame);if(animation.current!==null)cancelAnimationFrame(animation.current)}},[markdown,measure]);
  useEffect(()=>{const player=new Audio("/page.mp3");player.preload="auto";player.volume=.28;player.load();audio.current=player;return()=>{player.pause();audio.current=null}},[]);
  useEffect(()=>{if(!goToId||!content.current||!viewport.current)return;const el=content.current.querySelector(`#${CSS.escape(goToId)}`) as HTMLElement|null;if(el)setPosition(Math.floor(el.offsetLeft/viewport.current.clientWidth))},[goToId,pages,setPosition]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)||animating.current)return;if(e.key==="ArrowRight"||e.key==="PageDown"){e.preventDefault();turn(pageRef.current+1,false)}else if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();turn(pageRef.current-1,true)}};addEventListener("keydown",key);return()=>removeEventListener("keydown",key)},[turn]);

  const down=(e:React.PointerEvent)=>{if(animating.current||(e.target as HTMLElement).closest("a,button,input,textarea,[role=dialog]")||getSelection()?.toString())return;gesture.current={x:e.clientX,y:e.clientY,t:performance.now()};e.currentTarget.setPointerCapture(e.pointerId)};
  const pointerMove=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(g.horizontal===undefined&&Math.max(Math.abs(dx),Math.abs(dy))>8)g.horizontal=Math.abs(dx)>Math.abs(dy);if(!g.horizontal)return;e.preventDefault();dragProgress.current=Math.min(.86,Math.abs(dx)/e.currentTarget.clientWidth);showEffect(dragProgress.current,dx>0)};
  const finish=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,velocity=Math.abs(dx)/Math.max(1,performance.now()-g.t),fromLeft=dx>0;const commit=g.horizontal&&(Math.abs(dx)>e.currentTarget.clientWidth*.2||velocity>.65);if(commit)turn(pageRef.current+(dx<0?1:-1),fromLeft,dragProgress.current);else if(g.horizontal)settle(0,fromLeft,null);else if(Math.abs(dx)<8&&Math.abs(e.clientY-g.y)<8){const ratio=e.clientX/e.currentTarget.clientWidth;if(ratio<.25)turn(pageRef.current-1,true);else if(ratio>.75)turn(pageRef.current+1,false);else onUiToggle()}gesture.current=null};

  return <div className="page-reader"><div className="page-viewport" ref={viewport} onPointerDown={down} onPointerMove={pointerMove} onPointerUp={finish} onPointerCancel={finish}><div ref={content} className="page-columns"><MarkdownRenderer markdown={markdown}/></div></div><div ref={effect} className="page-turn-texture from-right" aria-hidden="true"><i/><b/></div><div className="page-number" aria-live="polite">{page+1} / {pages}</div></div>;
}
