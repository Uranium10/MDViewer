import Link from "next/link";

export default function EncryptedShareNotFound() {
  return <main className="not-found"><p className="eyebrow">404 · EXPIRED</p><h1>이 링크는 만료되었습니다</h1><p>공유 문서는 생성 후 7일이 지나면 자동 삭제됩니다.<br/>주소가 잘못된 경우에도 이 화면이 표시될 수 있습니다.</p><Link href="/">MD북스로 돌아가기</Link></main>;
}
