import type { Metadata, Viewport } from "next";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: SITE_NAME,
  title: { default: `${SITE_NAME} — Markdown 전자책 Reader`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: ["MD북스", "MDViewer", "Markdown Viewer", "마크다운 뷰어", "전자책 리더", "Ebook Reader", "웹소설 뷰어", "텍스트 뷰어"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ko_KR", url: "/", siteName: SITE_NAME, title: `${SITE_NAME} — Markdown 전자책 Reader`, description: SITE_DESCRIPTION },
  twitter: { card: "summary", title: `${SITE_NAME} — Markdown 전자책 Reader`, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
  category: "technology",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit:"cover", colorScheme: "light dark", themeColor: [{media:"(prefers-color-scheme: light)",color:"#13272a"},{media:"(prefers-color-scheme: dark)",color:"#050707"}] };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko" suppressHydrationWarning><body>{children}</body></html>}
