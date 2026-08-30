"use client";
import { memo } from "react";

function ReaderGuidebook({onBack}:{onBack:()=>void}){
  return <section className="reader-guidebook" role="dialog" aria-modal="true" aria-labelledby="guidebook-title">
    <header><button onClick={onBack} aria-label="읽던 문서로 돌아가기">←</button><div><small>MD BOOKS MANUAL</small><h2 id="guidebook-title">MD북스 가이드북</h2></div></header>
    <div className="guidebook-content">
      <section><span>01</span><h3>MD북스 소개</h3><p>MD북스는 EPUB, Markdown과 일반 텍스트 문서를 브라우저 안의 전자책처럼 읽고, 필요한 경우 텍스트 문서를 공유 링크로 전달할 수 있는 가벼운 웹 리더입니다.</p></section>
      <section><span>02</span><h3>책과 문서 열기</h3><p>첫 화면의 열기 영역을 누르거나 <code>.epub</code>, <code>.md</code>, <code>.txt</code> 파일을 끌어다 놓으세요. AI 답변이나 긴 글을 복사한 뒤 첫 화면에서 Ctrl+V로 붙여넣어도 바로 책이 됩니다.</p></section>
      <section><span>03</span><h3>페이지 이동</h3><p>본문을 좌우로 넘기거나 화면 가장자리를 누르세요. 키보드에서는 방향키와 Page Up·Page Down을 사용할 수 있습니다. 하단 진행바를 좌우로 밀면 여러 페이지를 빠르게 탐색할 수 있습니다.</p></section>
      <section><span>04</span><h3>페이지 직접 입력</h3><p>하단의 현재 페이지 숫자를 누른 뒤 원하는 페이지를 입력하고 Enter를 누르세요. 존재하는 페이지 범위 안으로 자동 조정됩니다.</p></section>
      <section><span>05</span><h3>북마크와 이어 읽기</h3><p>페이지 숫자 옆의 리본을 눌러 현재 위치를 북마크하세요. EPUB은 표준 CFI 위치로, 텍스트 문서는 진행률로 저장되어 다음 세션에서 복원됩니다.</p></section>
      <section><span>06</span><h3>읽기 설정</h3><p>상단 검은 상태바를 아래로 끌면 밝기, 스크롤·페이지 방식, 글자 크기, 행간과 글꼴을 변경할 수 있습니다.</p></section>
      <section><span>07</span><h3>공유와 저장</h3><p>텍스트 문서는 하단 메뉴에서 암호화된 공유 링크를 만들거나 Markdown·Word 문서 저장, PDF 인쇄와 텍스트 복사를 선택할 수 있습니다. EPUB은 서버에 올리지 않고 이 기기에서만 읽으며 원본 파일로 다시 저장할 수 있습니다. 공유 문서는 서버에 암호문만 보관되고 7일 후 자동 삭제됩니다.</p></section>
    </div>
  </section>;
}

export default memo(ReaderGuidebook);
