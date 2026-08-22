"use client";

import { DragEvent, useRef, useState } from "react";
import NovelReader from "@/components/reader/NovelReader";
import { inferTitle } from "@/lib/markdown";

export default function EditorWorkspace() {
  const [document, setDocument] = useState<{ title: string; markdown: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!document) return;
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
      if (navigator.share) await navigator.share({ title: document.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("공유 링크를 복사했습니다.");
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError")
        setMessage(error instanceof Error ? error.message : "공유에 실패했습니다.");
    }
  };

  return <main className="device-stage">
    <section className={`ebook-device ${document ? "is-reading" : "is-library"}`}>
      {!document ? <button
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
      </button> : <NovelReader
        documentId={`local:${document.title}`}
        title={document.title}
        markdown={document.markdown}
        onBack={leaveReader}
        onShare={() => void share()}
      />}
      <input ref={inputRef} hidden type="file" accept=".md,.txt,text/markdown,text/plain" onChange={(e) => void openFile(e.target.files?.[0])}/>
    </section>
    {!document && <div className="device-caption"><span>QUIET PAGE</span><p>파일은 이 기기에서 바로 열립니다</p></div>}
    {message && <div className="device-toast" role="status" onClick={() => setMessage("")}>{message}</div>}
  </main>;
}
