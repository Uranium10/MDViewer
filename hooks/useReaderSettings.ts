"use client";
import { useEffect, useState } from "react";
import type { ReaderSettings } from "@/types/document";
const defaults: ReaderSettings = { mode: "scroll", fontSize: 18, lineHeight: 1.9, width: "default", fontFamily: "sans", theme: "light" };
export function useReaderSettings() { const [settings, setSettings] = useState(defaults); const [ready, setReady] = useState(false); useEffect(() => { try { const saved = localStorage.getItem("reader-settings"); if (saved) setSettings({ ...defaults, ...JSON.parse(saved) }); } catch {} setReady(true); }, []); useEffect(() => { if (ready) localStorage.setItem("reader-settings", JSON.stringify(settings)); }, [settings, ready]); return { settings, setSettings, ready }; }
