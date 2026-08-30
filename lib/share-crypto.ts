"use client";

import type { DecryptedSharedDocument } from "@/types/document";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024;
const HEADER_BYTES = 5;

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid base64url value");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function encryptSharedDocument(document: DecryptedSharedDocument) {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoder = new TextEncoder();
  const title = encoder.encode((document.title || "제목 없는 작품").slice(0, 200));
  const markdown = encoder.encode(document.markdown);
  if (markdown.byteLength > MAX_MARKDOWN_BYTES) throw new Error("문서는 2MB 이하여야 합니다.");
  const plaintext = new Uint8Array(HEADER_BYTES + title.byteLength + markdown.byteLength);
  plaintext[0] = 2;
  new DataView(plaintext.buffer).setUint32(1, title.byteLength);
  plaintext.set(title, HEADER_BYTES);
  plaintext.set(markdown, HEADER_BYTES + title.byteLength);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  return { key: encodeBase64Url(rawKey), iv: encodeBase64Url(iv), ciphertext: encodeBase64Url(ciphertext) };
}

export async function decryptSharedDocument(ciphertext: string, iv: string, encodedKey: string): Promise<DecryptedSharedDocument> {
  const rawKey = decodeBase64Url(encodedKey);
  const rawIv = decodeBase64Url(iv);
  if (rawKey.byteLength !== KEY_BYTES || rawIv.byteLength !== IV_BYTES) throw new Error("Invalid encryption parameters");
  const key = await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: rawIv }, key, decodeBase64Url(ciphertext)));
  if (plaintext.byteLength < HEADER_BYTES || plaintext[0] !== 2) throw new Error("Invalid encrypted document");
  const titleLength = new DataView(plaintext.buffer, plaintext.byteOffset, plaintext.byteLength).getUint32(1);
  if (titleLength > plaintext.byteLength - HEADER_BYTES) throw new Error("Invalid encrypted document");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const title = decoder.decode(plaintext.subarray(HEADER_BYTES, HEADER_BYTES + titleLength));
  const markdown = decoder.decode(plaintext.subarray(HEADER_BYTES + titleLength));
  if (!markdown.trim()) throw new Error("Invalid encrypted document");
  return { title: title || "제목 없는 작품", markdown };
}

export function readShareKey(fragment: string) {
  return new URLSearchParams(fragment.startsWith("#") ? fragment.slice(1) : fragment).get("k");
}
