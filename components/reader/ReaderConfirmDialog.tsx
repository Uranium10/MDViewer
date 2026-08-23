"use client";
import { useEffect, useRef } from "react";

type Props={onConfirm:()=>void;onCancel:()=>void};

export default function ReaderConfirmDialog({onConfirm,onCancel}:Props){
  const safeButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{safeButton.current?.focus()},[]);
  return <div className="device-panel-backdrop reader-confirm-backdrop" onPointerDown={event=>{if(event.target===event.currentTarget)onCancel()}}>
    <section className="reader-confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby="reader-exit-title" aria-describedby="reader-exit-description" onKeyDown={event=>{if(event.key==="Escape")onCancel()}}>
      <header><span>EXIT READER</span><i className="confirm-book-icon" aria-hidden="true"/></header>
      <div><h2 id="reader-exit-title">책을 닫을까요?</h2><p id="reader-exit-description">읽던 위치와 북마크는 자동으로 저장됩니다.</p></div>
      <footer><button ref={safeButton} onClick={onCancel}>계속 읽기</button><button className="is-danger" onClick={onConfirm}>책 닫기</button></footer>
    </section>
  </div>;
}
