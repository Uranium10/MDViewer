import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return { name: `${SITE_NAME} — EPUB·Markdown Ebook Reader`, short_name: SITE_NAME, description: SITE_DESCRIPTION, start_url: "/", display: "standalone", background_color: "#eef0e7", theme_color: "#13272a", lang: "ko" };
}
