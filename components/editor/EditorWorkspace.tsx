"use client";

import { DragEvent, useCallback, useEffect, useRef, useState } from "react";
import NovelReader from "@/components/reader/NovelReader";
import ReaderGuidebook from "@/components/reader/ReaderGuidebook";
import { inferTitle } from "@/lib/markdown";
import { createContentId } from "@/lib/content-id";

type LocalDocument={id:string;title:string;markdown:string};
type LoadingState={progress:number;label:string}|null;
const nextPaint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));

export default function EditorWorkspace() {
  const [document, setDocument] = useState<LocalDocument | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState("--:--");
  const [loading,setLoading]=useState<LoadingState>(null);
  const [libraryGuide,setLibraryGuide]=useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sharing = useRef(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => setClock(new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    update();
    const timer = setInterval(update, 30_000);
    return () => { clearInterval(timer); if (messageTimer.current) clearTimeout(messageTimer.current); };
  }, []);

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
    setDocument({id,title:inferTitle(markdown,filename),markdown});
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

  useEffect(()=>{if(document||loading||libraryGuide)return;const paste=(event:ClipboardEvent)=>{if((event.target as HTMLElement|null)?.closest("input,textarea,[contenteditable=true]"))return;const text=event.clipboardData?.getData("text/plain")||"";if(!text.trim())return;event.preventDefault();void openPastedText(text)};addEventListener("paste",paste);return()=>removeEventListener("paste",paste)},[document,libraryGuide,loading,openPastedText]);
  useEffect(()=>{const pop=(event:PopStateEvent)=>setLibraryGuide(Boolean(event.state?.mdBooksLibraryGuide));addEventListener("popstate",pop);return()=>removeEventListener("popstate",pop)},[]);

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void openFile(event.dataTransfer.files[0]);
  };

  const leaveReader = () => {
    if (window.confirm("책을 닫고 처음 화면으로 나가시겠습니까?")) setDocument(null);
  };

  const createShareLink = async () => {
    if (!document) return;
    if(sharing.current)throw new Error("공유 링크를 이미 만드는 중입니다.");
    sharing.current = true;
    setMessage("공유 링크를 만드는 중…");
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(document),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "공유에 실패했습니다.");
      const url = new URL(data.url, location.origin).href;
      setMessage("");return url;
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError")
        flash(error instanceof Error ? error.message : "공유에 실패했습니다.", 2600);
      throw error;
    } finally {
      sharing.current = false;
      setMessage(current => current === "공유 링크를 만드는 중…" ? "" : current);
    }
  };

  const shareApp = async () => {
    const data = { title: "MD북스", text: "Markdown과 텍스트를 전자책처럼 읽고 공유하는 MDViewer", url: location.href };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.href); flash("MD북스 주소를 복사했습니다."); } } catch {}
  };
  const openLibraryGuide=()=>{if(libraryGuide)return;history.pushState({...history.state,mdBooksLibraryGuide:true},"",location.href);setLibraryGuide(true)};
  const closeLibraryGuide=()=>{if(history.state?.mdBooksLibraryGuide)history.back();else setLibraryGuide(false)};

  return <main className="device-stage" onDragStart={event => { if (!(event.target as HTMLElement).closest(".ebook-device")) event.preventDefault(); }}>
    <section className={`ebook-device ${document ? "is-reading" : "is-library"}`}>
      {!document ? <><header className="library-status"><strong>MD북스</strong><time>{clock}</time><button className="reader-help" onClick={openLibraryGuide} aria-label="MD북스 도움말"><i className="pixel-icon icon-help" aria-hidden="true">?</i></button></header><button
        className={`open-book ${dragging ? "is-dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        aria-label="Markdown 또는 텍스트 파일 열기"
      >
        <span className="open-cross" aria-hidden="true"><i/><i/></span>
        <strong>{dragging ? "여기에 놓기" : "열기"}</strong>
        <small>.md · .txt · Ctrl+V</small>
      </button><nav className="feature-toolbar library-toolbar" aria-label="시작 화면 메뉴"><LibraryTool icon="share" label="공유하기" onClick={()=>void shareApp()}/><LibraryTool icon="memo" label="메모하기" disabled/><LibraryTool icon="tetris" label="게임하기" disabled/></nav>{loading&&<div className="library-loading" role="status"><strong>{loading.label}</strong><div><span style={{width:`${loading.progress}%`}}/></div><small>{loading.progress}%</small></div>}{libraryGuide&&<ReaderGuidebook onBack={closeLibraryGuide}/>}</> : <NovelReader
        documentId={`local:${document.id}`}
        title={document.title}
        markdown={document.markdown}
        onBack={leaveReader}
        onCreateShare={createShareLink}
      />}
      <input ref={inputRef} hidden type="file" accept=".md,.txt,text/markdown,text/plain" onChange={(e) => void openFile(e.target.files?.[0])}/>
    </section>
    {!document && <div className="device-caption"><span>MD북스</span><p>Markdown · Text Ebook Reader &amp; Viewer</p></div>}
    {message && <div className="device-toast" role="status" onClick={() => setMessage("")}>{message}</div>}
  </main>;
}

function LibraryTool({icon,label,onClick,disabled=false}:{icon:string;label:string;onClick?:()=>void;disabled?:boolean}){return <button onClick={onClick} disabled={disabled} aria-label={disabled?`${label}, 준비 중`:label}><i className={`pixel-icon icon-${icon}`} aria-hidden="true"/><span>{label}</span></button>}
