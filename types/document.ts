export interface SharedDocument { id: string; title: string; markdown: string; createdAt: string }
export type ReaderMode = "scroll" | "page";
export type ReaderTheme = "light" | "dark";
export type ReaderWidth = "narrow" | "default" | "wide";
export interface ReaderSettings { mode: ReaderMode; fontSize: number; lineHeight: number; width: ReaderWidth; fontFamily: "sans" | "serif"; theme: ReaderTheme }
