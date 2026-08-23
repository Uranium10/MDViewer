"use client";

type Props={onMarkdown:()=>void;onDocx:()=>Promise<void>;onPdf:()=>void;onCopy:()=>Promise<void>;onClose:()=>void};

export default function ReaderSavePanel({onMarkdown,onDocx,onPdf,onCopy,onClose}:Props){
  const run=(action:()=>void|Promise<void>)=>{void Promise.resolve(action()).finally(onClose)};
  return <section className="reader-device-popover save-popover" role="dialog" aria-label="저장하기"><header><strong>저장하기</strong><button onClick={onClose} aria-label="저장 메뉴 닫기">×</button></header><button onClick={()=>run(onMarkdown)}><i className="pixel-icon icon-md" aria-hidden="true">M</i><span>MD로 저장</span></button><button onClick={()=>run(onDocx)}><i className="pixel-icon icon-docx" aria-hidden="true">W</i><span>DOCX로 저장</span></button><button onClick={()=>run(onPdf)}><i className="pixel-icon icon-pdf" aria-hidden="true">P</i><span>PDF로 저장</span></button><button onClick={()=>run(onCopy)}><i className="pixel-icon icon-copy" aria-hidden="true"/><span>텍스트로 복사</span></button></section>;
}
