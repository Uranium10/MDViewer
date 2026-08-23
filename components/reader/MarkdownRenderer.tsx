import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { slugify } from "@/lib/markdown";

function MarkdownRenderer({ markdown }: { markdown: string }) {
  let headingIndex = 0;
  const components: Components = {
    h1: ({ children }) => <h1 id={slugify(String(children), headingIndex++)}>{children}</h1>,
    h2: ({ children }) => {
      const text = String(children);
      return <h2 id={slugify(text, headingIndex++)} className={/^\d+$/.test(text.trim()) ? "numeric-heading" : ""}>{children}</h2>;
    },
    h3: ({ children }) => <h3 id={slugify(String(children), headingIndex++)}>{children}</h3>,
    a: ({ href, children }) => <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}>{children}</a>,
  };
  return <div className="reader-prose"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>{markdown}</ReactMarkdown></div>;
}

export default memo(MarkdownRenderer);
