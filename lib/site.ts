export const SITE_NAME = "MD북스";
export const SITE_DESCRIPTION = "EPUB, Markdown과 텍스트 파일을 브라우저에서 전자책처럼 읽고 텍스트 문서를 암호화된 URL로 공유하는 가벼운 Ebook Reader입니다.";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const value = configured || (vercel ? `https://${vercel}` : "http://localhost:3000");
  try { return new URL(value); } catch { return new URL("http://localhost:3000"); }
}
