import Link from "next/link";
export default function NotFound() { return <main className="not-found"><p className="eyebrow">404</p><h1>이 작품을 찾을 수 없습니다.</h1><p>링크가 잘못되었거나 작품이 삭제되었을 수 있습니다.</p><Link href="/">새 문서 만들기</Link></main>; }
