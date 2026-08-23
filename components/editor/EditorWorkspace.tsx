"use client";

import { DragEvent, useEffect, useRef, useState } from "react";
import NovelReader from "@/components/reader/NovelReader";
import { inferTitle } from "@/lib/markdown";

export default function EditorWorkspace() {
  const [document, setDocument] = useState<{ title: string; markdown: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState("--:--");
  const inputRef = useRef<HTMLInputElement>(null);
  const sharing = useRef(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => setClock(new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    update();
    const timer = setInterval(update, 30_000);
    return () => { clearInterval(timer); if (messageTimer.current) clearTimeout(messageTimer.current); };
  }, []);

  const flash = (text: string, duration = 1800) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(text);
    messageTimer.current = setTimeout(() => setMessage(""), duration);
  };

  const openFile = async (file?: File) => {
    if (!file || !/\.(md|txt)$/i.test(file.name)) {
      setMessage(".md 또는 .txt 파일을 선택해 주세요.");
      return;
    }
    try {
      const markdown = await file.text();
      if (!markdown.trim()) throw new Error("빈 파일은 열 수 없습니다.");
      setDocument({ title: inferTitle(markdown, file.name), markdown });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
    }
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void openFile(event.dataTransfer.files[0]);
  };

  const leaveReader = () => {
    if (window.confirm("책을 닫고 처음 화면으로 나가시겠습니까?")) setDocument(null);
  };

  const share = async () => {
    if (!document || sharing.current) return;
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
      if (navigator.share) { await navigator.share({ title: document.title, url }); setMessage(""); }
      else {
        await navigator.clipboard.writeText(url);
        flash("공유 링크를 복사했습니다.");
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError")
        flash(error instanceof Error ? error.message : "공유에 실패했습니다.", 2600);
    } finally {
      sharing.current = false;
      setMessage(current => current === "공유 링크를 만드는 중…" ? "" : current);
    }
  };

  const shareApp = async () => {
    const data = { title: "MD북스", text: "Markdown과 텍스트를 전자책처럼 읽고 공유하는 MDViewer", url: location.href };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.href); flash("MD북스 주소를 복사했습니다."); } } catch {}
  };

  return <main className="device-stage" onDragStart={event => { if (!(event.target as HTMLElement).closest(".ebook-device")) event.preventDefault(); }}>
    <section className={`ebook-device ${document ? "is-reading" : "is-library"}`}>
      {!document ? <><header className="library-status"><strong>MD북스</strong><time>{clock}</time><button onClick={() => void shareApp()} aria-label="MD북스 공유"><span aria-hidden="true">↑</span></button></header><button
        className={`open-book ${dragging ? "is-dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        aria-label="Markdown 또는 텍스트 파일 열기"
      >
        <span className="open-cross" aria-hidden="true"><i/><i/></span>
        <strong>{dragging ? "여기에 놓기" : "열기"}</strong>
        <small>.md · .txt</small>
      </button></> : <NovelReader
        documentId={`local:${document.title}`}
        title={document.title}
        markdown={document.markdown}
        onBack={leaveReader}
        onShare={() => void share()}
      />}
      <input ref={inputRef} hidden type="file" accept=".md,.txt,text/markdown,text/plain" onChange={(e) => void openFile(e.target.files?.[0])}/>
    </section>
    {!document && <div className="device-caption"><span>MD북스</span><p>Markdown · Text Ebook Reader &amp; Viewer</p></div>}
    {message && <div className="device-toast" role="status" onClick={() => setMessage("")}>{message}</div>}
  </main>;
}
