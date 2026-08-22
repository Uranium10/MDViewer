import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Quiet Page — Markdown Web Reader", description: "Markdown으로 쓰고 전자책처럼 읽어 공유하세요." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko" suppressHydrationWarning><body>{children}</body></html>; }
