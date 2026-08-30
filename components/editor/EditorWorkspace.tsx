"use client";

import { DragEvent, useCallback, useEffect, useRef, useState } from "react";
import NovelReader from "@/components/reader/NovelReader";
import ReaderGuidebook from "@/components/reader/ReaderGuidebook";
import ReaderSharePanel from "@/components/reader/ReaderSharePanel";
import EInkTetris from "@/components/game/EInkTetris";
import { inferTitle } from "@/lib/markdown";
import { createContentId } from "@/lib/content-id";
import { encryptSharedDocument } from "@/lib/share-crypto";
import { loadRecentDocument, readRecentMeta, saveRecentDocument, writeRecentMeta, type RecentDocument, type RecentDocumentMeta } from "@/lib/recent-document";
import type { ShareLink } from "@/types/document";

type LocalDocument={id:string;title:string;filename:string;markdown:string};
type LoadingState={progress:number;label:string}|null;
const nextPaint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));

export default function EditorWorkspace() {
  const [document, setDocument] = useState<LocalDocument | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState("--:--");
  const [loading,setLoading]=useState<LoadingState>(null);
  const [recent,setRecent]=useState<RecentDocumentMeta|null>(null);
  const [libraryGuide,setLibraryGuide]=useState(false),[libraryShare,setLibraryShare]=useState(false),[gameOpen,setGameOpen]=useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sharing = useRef(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentWriteTimer=useRef<ReturnType<typeof setTimeout>|null>(null),recentDocument=useRef<RecentDocument|null>(null),recentMeta=useRef<RecentDocumentMeta|null>(null);

  useEffect(() => {
    const update = () => setClock(new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    update();
    const timer = setInterval(update, 30_000);
    return () => { clearInterval(timer); if (messageTimer.current) clearTimeout(messageTimer.current); if(recentWriteTimer.current)clearTimeout(recentWriteTimer.current); };
  }, []);

  useEffect(()=>{let cancelled=false;const meta=readRecentMeta();void loadRecentDocument().then(saved=>{if(cancelled||!saved||!meta||saved.id!==meta.id)return;recentDocument.current=saved;recentMeta.current=meta;setRecent(meta)}).catch(()=>{});return()=>{cancelled=true}},[]);

  const flash = useCallback((text: string, duration = 1800) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(text);
    messageTimer.current = setTimeout(() => setMessage(""), duration);
  },[]);

  const finishOpen=useCallback(async(markdown:string,filename:string,showProgress=false)=>{
    if(!markdown.trim())throw new Error("빈 내용은 열 수 없습니다.");
    if(showProgress){setLoading({progress:92,label:"책 구성 중"});await nextPaint()}
    const id=await createContentId(markdown);
    if(showProgress){setLoading({progress:100,label:"책 준비 완료"});await nextPaint()}
    const next={id,title:inferTitle(markdown,filename),filename,markdown},savedMeta=readRecentMeta(),meta=savedMeta?.id===id?savedMeta:{id,title:next.title,filename,currentPage:1,totalPages:1,updatedAt:Date.now()};
    recentDocument.current=next;recentMeta.current=meta;setRecent(meta);writeRecentMeta(meta);void saveRecentDocument(next).catch(()=>{});setDocument(next);
    setLoading(null);setMessage("");
  },[]);

  const openPastedText=useCallback(async(text:string)=>{
    const isLong=text.length>120_000;
    try{
      if(!isLong){await finishOpen(text,"클립보드.md");return}
      setLoading({progress:4,label:"클립보드 읽는 중"});await nextPaint();
      const chunks:string[]=[];const chunkSize=64*1024;
      for(let offset=0;offset<text.length;offset+=chunkSize){chunks.push(text.slice(offset,offset+chunkSize));setLoading({progress:Math.min(88,4+Math.round((offset+chunkSize)/text.length*84)),label:"긴 문서 준비 중"});await nextPaint()}
      await finishOpen(chunks.join(""),"클립보드.md",true);
    }catch(error){setLoading(null);flash(error instanceof Error?error.message:"클립보드를 읽지 못했습니다.",2600)}
  },[finishOpen,flash]);

  const openFile = async (file?: File) => {
    if (!file || !/\.(md|txt)$/i.test(file.name)) {
      setMessage(".md 또는 .txt 파일을 선택해 주세요.");
      return;
    }
    try {
      if(file.size<120_000){await finishOpen(await file.text(),file.name);return}
      setLoading({progress:2,label:"파일 읽는 중"});await nextPaint();
      const reader=file.stream().getReader(),decoder=new TextDecoder();let loaded=0;const chunks:string[]=[];
      while(true){const{done,value}=await reader.read();if(done)break;loaded+=value.byteLength;chunks.push(decoder.decode(value,{stream:true}));setLoading({progress:Math.min(88,2+Math.round(loaded/Math.max(1,file.size)*86)),label:"긴 파일 읽는 중"});await nextPaint()}
      chunks.push(decoder.decode());await finishOpen(chunks.join(""),file.name,true);
    } catch (error) {
      setLoading(null);
      setMessage(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
    }
  };

  useEffect(()=>{if(document||loading||libraryGuide||libraryShare||gameOpen)return;const paste=(event:ClipboardEvent)=>{if((event.target as HTMLElement|null)?.closest("input,textarea,[contenteditable=true]"))return;const text=event.clipboardData?.getData("text/plain")||"";if(!text.trim())return;event.preventDefault();void openPastedText(text)};addEventListener("paste",paste);return()=>removeEventListener("paste",paste)},[document,gameOpen,libraryGuide,libraryShare,loading,openPastedText]);
  useEffect(()=>{const pop=(event:PopStateEvent)=>setLibraryGuide(Boolean(event.state?.mdBooksLibraryGuide));addEventListener("popstate",pop);return()=>removeEventListener("popstate",pop)},[]);

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file=event.dataTransfer.files[0];
    if(file){void openFile(file);return}
    const text=event.dataTransfer.getData("text/plain");
    if(text.trim())void openPastedText(text);
  };

  const updateRecentPage=useCallback((id:string,currentPage:number,totalPages:number)=>{const current=recentMeta.current;if(!current||current.id!==id)return;const next={...current,currentPage:Math.max(1,currentPage),totalPages:Math.max(1,totalPages),updatedAt:Date.now()};recentMeta.current=next;if(recentWriteTimer.current)clearTimeout(recentWriteTimer.current);recentWriteTimer.current=setTimeout(()=>writeRecentMeta(next),220)},[]);
  const leaveReader = () => {if(recentMeta.current){writeRecentMeta(recentMeta.current);setRecent(recentMeta.current)}setDocument(null)};
  const resumeRecent=async()=>{try{const saved=recentDocument.current||await loadRecentDocument();if(!saved||!recent||saved.id!==recent.id)throw new Error("이어 읽을 문서를 찾지 못했습니다.");recentDocument.current=saved;setDocument(saved);setMessage("")}catch(error){flash(error instanceof Error?error.message:"문서를 다시 열지 못했습니다.",2600)}};

  const createShareLink = async (): Promise<ShareLink | undefined> => {
    if (!document) return;
    if(sharing.current)throw new Error("공유 링크를 이미 만드는 중입니다.");
    sharing.current = true;
    setMessage("공유 링크를 만드는 중…");
    try {
      const encrypted=await encryptSharedDocument({title:document.title,markdown:document.markdown});
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ciphertext:encrypted.ciphertext,iv:encrypted.iv,encryptionVersion:2}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "공유에 실패했습니다.");
      const url = new URL(data.url, location.origin);
      url.hash=new URLSearchParams({k:encrypted.key}).toString();
      setMessage("");return{url:url.href,expiresAt:typeof data.expiresAt==="string"?data.expiresAt:undefined};
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError")
        flash(error instanceof Error ? error.message : "공유에 실패했습니다.", 2600);
      throw error;
    } finally {
      sharing.current = false;
      setMessage(current => current === "공유 링크를 만드는 중…" ? "" : current);
    }
  };

  const shareApp = () => setLibraryShare(true);
  const openGame=()=>{setLibraryGuide(false);setLibraryShare(false);setGameOpen(true)};
  const openFilePicker=()=>{const input=inputRef.current;if(!input)return;input.accept=matchMedia("(pointer: coarse)").matches?"*/*":".md,.txt,text/markdown,text/plain";input.click()};
  const openLibraryGuide=()=>{setLibraryShare(false);history.pushState({...history.state,mdBooksLibraryGuide:true},"",location.href);setLibraryGuide(true)};
  const closeLibraryGuide=()=>{setLibraryGuide(false);if(history.state?.mdBooksLibraryGuide)history.back()};
  const toggleLibraryGuide=()=>libraryGuide?closeLibraryGuide():openLibraryGuide();

  return <main className="device-stage" onDragStart={event => { if (!(event.target as HTMLElement).closest(".ebook-device")) event.preventDefault(); }}>
    <section className={`ebook-device ${document ? "is-reading" : gameOpen?"is-game":"is-library"}`} onDragOver={event=>{if(document||libraryGuide||libraryShare||gameOpen)return;event.preventDefault();setDragging(true)}} onDragLeave={event=>{if(document||event.currentTarget.contains(event.relatedTarget as Node))return;setDragging(false)}} onDrop={event=>{if(document||libraryGuide||libraryShare||gameOpen)return;drop(event)}}>
      {document ? <NovelReader
        documentId={`local:${document.id}`}
        title={document.title}
        markdown={document.markdown}
        onBack={leaveReader}
        onCreateShare={createShareLink}
        onPageChange={(current,total)=>updateRecentPage(document.id,current,total)}
      /> : gameOpen?<EInkTetris onBack={()=>setGameOpen(false)}/>:<><header className="library-status"><strong>MD북스</strong><time>{clock}</time><button className="reader-help" onClick={toggleLibraryGuide} aria-label={libraryGuide?"MD북스 도움말 닫기":"MD북스 도움말 열기"} aria-expanded={libraryGuide}><i className="pixel-icon icon-help" aria-hidden="true">?</i></button></header><div className={`open-book ${dragging ? "is-dragging" : ""}`}><button
        className="open-book-primary"
        onClick={openFilePicker}
        aria-label="Markdown 또는 텍스트 파일 열기"
      >
        <span className="open-cross" aria-hidden="true"><i/><i/></span>
        <strong>{dragging ? "여기에 놓으세요" : "열기"}</strong>
        <span className="open-copy">{dragging ? "파일을 놓으면 바로 열립니다" : "누르거나 파일을 끌어다 놓으세요"}</span>
        <small>복사한 텍스트는 화면 어디서나 붙여넣을 수 있어요</small>
        <span className="mobile-open-copy">눌러서 파일을 여세요</span>
      </button>{recent&&<button className="resume-book" onClick={()=>void resumeRecent()} aria-label={`${recent.filename}, ${recent.currentPage} / ${recent.totalPages} 페이지부터 이어읽기`}><span>이어읽기</span><strong title={recent.filename}>{recent.filename}</strong><small>{recent.currentPage} / {recent.totalPages} 페이지</small></button>}<footer className="library-footer">개발자 연락: <a href="mailto:kdm10ho@naver.com">kdm10ho@naver.com</a></footer></div><nav className="feature-toolbar library-toolbar" aria-label="시작 화면 메뉴"><LibraryTool icon="share" label="공유" onClick={shareApp}/><LibraryTool icon="memo" label="메모" disabled/><LibraryTool icon="tetris" label="게임" onClick={openGame}/></nav>{loading&&<div className="library-loading" role="status"><strong>{loading.label}</strong><div><span style={{width:`${loading.progress}%`}}/></div><small>{loading.progress}%</small></div>}{libraryGuide&&<ReaderGuidebook onBack={closeLibraryGuide}/>} {libraryShare&&<ReaderSharePanel title="MD북스" onCreateShare={async()=>({url:location.href})} onClose={()=>setLibraryShare(false)} modal copySuccess="MD북스를 공유해줘서 고마워요."/>}</>}
      <input ref={inputRef} hidden type="file" accept=".md,.txt,text/markdown,text/plain" onChange={(e) => void openFile(e.target.files?.[0])}/>
    </section>
    {!document&&!gameOpen&&<div className="device-caption"><span>MD북스</span><p>Markdown · Text Ebook Reader &amp; Viewer</p></div>}
    {message && <div className="device-toast" role="status" onClick={() => setMessage("")}>{message}</div>}
  </main>;
}

function LibraryTool({icon,label,onClick,disabled=false}:{icon:string;label:string;onClick?:()=>void;disabled?:boolean}){return <button onClick={onClick} disabled={disabled} aria-label={disabled?`${label}, 준비 중`:label}><i className={`pixel-icon icon-${icon}`} aria-hidden="true"/><span>{label}</span></button>}
