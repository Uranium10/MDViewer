"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { decryptSharedDocument, readShareKey } from "@/lib/share-crypto";
import type { DecryptedSharedDocument } from "@/types/document";
import NovelReader from "./NovelReader";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; document: DecryptedSharedDocument }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "error" };

export default function EncryptedSharedReader({ id }: { id: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const key = readShareKey(location.hash);
      if (!key) {
        setState({ status: "invalid" });
        return;
      }
      try {
        const response = await fetch(`/api/share/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (response.status === 404) {
          setState({ status: data.code === "expired" ? "expired" : "invalid" });
          return;
        }
        if (!response.ok || data.encryptionVersion !== 2 || typeof data.ciphertext !== "string" || typeof data.iv !== "string") {
          setState({ status: "error" });
          return;
        }
        try {
          const document = await decryptSharedDocument(data.ciphertext, data.iv, key);
          if (!controller.signal.aborted) setState({ status: "ready", document });
        } catch {
          if (!controller.signal.aborted) setState({ status: "invalid" });
        }
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      }
    };
    void load();
    return () => controller.abort();
  }, [id]);

  if (state.status === "ready") {
    return <main className="device-stage shared-stage"><section className="ebook-device is-reading"><NovelReader documentId={`shared:${id}`} title={state.document.title} markdown={state.document.markdown}/></section></main>;
  }
  if (state.status === "loading") return <ShareMessage eyebrow="ENCRYPTED" title="암호화된 문서를 여는 중입니다" message="이 기기에서만 문서를 복호화하고 있어요."/>;
  if (state.status === "expired") return <ShareMessage eyebrow="EXPIRED" title="이 링크는 만료되었습니다" message="공유 문서는 생성 후 7일이 지나면 자동 삭제됩니다."/>;
  if (state.status === "invalid") return <ShareMessage eyebrow="INVALID LINK" title="링크가 올바르지 않습니다" message="주소의 암호화 키가 없거나 문서를 복호화할 수 없습니다."/>;
  return <ShareMessage eyebrow="ERROR" title="문서를 불러오지 못했습니다" message="잠시 후 다시 시도해 주세요."/>;
}

function ShareMessage({ eyebrow, title, message }: { eyebrow: string; title: string; message: string }) {
  return <main className="not-found"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{message}</p><Link href="/">MD북스로 돌아가기</Link></main>;
}
