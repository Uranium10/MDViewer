"use client";
import { useEffect, useRef, useState } from "react";

type Props={title:string;onCreateShare?:()=>Promise<string|undefined>;onClose:()=>void;modal?:boolean;copySuccess?:string};

export default function ReaderSharePanel({title,onCreateShare,onClose,modal=false,copySuccess="공유 링크를 복사했습니다."}:Props){
  const cachedUrl=useRef<string|null>(null);
  const statusTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const[working,setWorking]=useState(false),[status,setStatus]=useState("");
  useEffect(()=>()=>{if(statusTimer.current)clearTimeout(statusTimer.current)},[]);
  const announce=(message:string,duration=0)=>{if(statusTimer.current)clearTimeout(statusTimer.current);setStatus(message);if(duration)statusTimer.current=setTimeout(()=>setStatus(""),duration)};
  const resolveUrl=async()=>{if(cachedUrl.current)return cachedUrl.current;const created=await onCreateShare?.();const url=created||location.href;cachedUrl.current=url;return url};
  const act=async(action:(url:string)=>Promise<void>,success:string)=>{if(working)return;setWorking(true);announce("링크 준비 중…");try{await action(await resolveUrl());announce(success,1800)}catch(error){if((error as DOMException)?.name!=="AbortError")announce(error instanceof Error?error.message:"공유하지 못했습니다.",2600)}finally{setWorking(false)}};
  const canNativeShare=typeof navigator!=="undefined"&&typeof navigator.share==="function";
  const panel=<section className={`reader-device-popover share-popover ${modal?"is-modal":""}`} role="dialog" aria-modal={modal||undefined} aria-label="공유하기"><header><strong>공유하기</strong><button onClick={onClose} aria-label="공유 메뉴 닫기">×</button></header><button disabled={working} onClick={()=>void act(url=>navigator.clipboard.writeText(url),copySuccess)}><i className="pixel-icon icon-link" aria-hidden="true"/><span>링크 복사</span></button><button disabled={working||!canNativeShare} onClick={()=>void act(url=>navigator.share({title,url}),"공유 창을 열었습니다.")}><i className="pixel-icon icon-share" aria-hidden="true"/><span>기기로 공유</span></button>{status&&<p role="status">{status}</p>}</section>;
  return modal?<div className="library-modal-backdrop" onPointerDown={event=>{if(event.target===event.currentTarget)onClose()}}>{panel}</div>:panel;
}
