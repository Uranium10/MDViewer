"use client";
import { useRef, useState } from "react";

type Props={title:string;onCreateShare?:()=>Promise<string|undefined>;onClose:()=>void};

export default function ReaderSharePanel({title,onCreateShare,onClose}:Props){
  const cachedUrl=useRef<string|null>(null);
  const[working,setWorking]=useState(false),[status,setStatus]=useState("");
  const resolveUrl=async()=>{if(cachedUrl.current)return cachedUrl.current;const created=await onCreateShare?.();const url=created||location.href;cachedUrl.current=url;return url};
  const act=async(action:(url:string)=>Promise<void>,success:string)=>{if(working)return;setWorking(true);setStatus("링크 준비 중…");try{await action(await resolveUrl());setStatus(success)}catch(error){if((error as DOMException)?.name!=="AbortError")setStatus(error instanceof Error?error.message:"공유하지 못했습니다.")}finally{setWorking(false)}};
  const canNativeShare=typeof navigator!=="undefined"&&typeof navigator.share==="function";
  return <section className="reader-device-popover share-popover" role="dialog" aria-label="공유하기"><header><strong>공유하기</strong><button onClick={onClose} aria-label="공유 메뉴 닫기">×</button></header><button disabled={working} onClick={()=>void act(url=>navigator.clipboard.writeText(url),"공유 링크를 복사했습니다.")}><i className="pixel-icon icon-link" aria-hidden="true"/><span>링크 복사</span></button><button disabled={working||!canNativeShare} onClick={()=>void act(url=>navigator.share({title,url}),"공유 창을 열었습니다.")}><i className="pixel-icon icon-share" aria-hidden="true"/><span>기기로 공유</span></button>{status&&<p role="status">{status}</p>}</section>;
}
