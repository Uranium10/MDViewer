export interface EncryptedSharedDocument { id: string; ciphertext: string; iv: string; encryptionVersion: 2; createdAt: string; expiresAt: string }
export interface DecryptedSharedDocument { title: string; markdown: string }
export interface ShareLink { url: string; expiresAt?: string }
export type ReaderMode = "scroll" | "page";
export type ReaderTheme = "light" | "dark";
export type ReaderWidth = "narrow" | "default" | "wide";
export interface ReaderSettings { mode: ReaderMode; fontSize: number; lineHeight: number; width: ReaderWidth; fontFamily: "sans" | "serif"; theme: ReaderTheme }
