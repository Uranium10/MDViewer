import {
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type FileChild,
  type ParagraphChild,
} from "docx";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

import { safeFilename } from "@/lib/markdown";

type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string | null;
  depth?: number;
  ordered?: boolean | null;
  start?: number | null;
  identifier?: string;
  children?: MarkdownNode[];
};

type RunStyle = { bold?: boolean; italics?: boolean; strike?: boolean };

const bodyRun = (text: string, style: RunStyle = {}) => new TextRun({ text, font: "Malgun Gothic", size: 22, ...style });

function plainText(node: MarkdownNode): string {
  if (node.value) return node.value.replace(/<[^>]*>/g, "");
  if (node.type === "image" || node.type === "imageReference") return node.alt || "이미지";
  return node.children?.map(plainText).join("") || "";
}

function inlineChildren(nodes: MarkdownNode[] = [], style: RunStyle = {}): ParagraphChild[] {
  return nodes.flatMap((node): ParagraphChild[] => {
    if (node.type === "text") return [bodyRun(node.value || "", style)];
    if (node.type === "strong") return inlineChildren(node.children, { ...style, bold: true });
    if (node.type === "emphasis") return inlineChildren(node.children, { ...style, italics: true });
    if (node.type === "delete") return inlineChildren(node.children, { ...style, strike: true });
    if (node.type === "inlineCode") return [new TextRun({ text: node.value || "", font: "Consolas", size: 20, shading: { type: ShadingType.CLEAR, fill: "E8EAE3" } })];
    if (node.type === "break") return [new TextRun({ break: 1 })];
    if (node.type === "link" && node.url) {
      return [new ExternalHyperlink({ link: node.url, children: [new TextRun({ text: plainText(node), style: "Hyperlink", font: "Malgun Gothic", size: 22, ...style })] })];
    }
    if (node.type === "image" || node.type === "imageReference") return [bodyRun(`[이미지: ${node.alt || "설명 없음"}]`, { ...style, italics: true })];
    if (node.type === "footnoteReference") return [bodyRun(`[${node.identifier || "주석"}]`, style)];
    if (node.children) return inlineChildren(node.children, style);
    return node.value ? [bodyRun(node.value.replace(/<[^>]*>/g, ""), style)] : [];
  });
}

function paragraphFrom(node: MarkdownNode, options: { indent?: number; prefix?: string; italics?: boolean } = {}) {
  const children: ParagraphChild[] = [];
  if (options.prefix) children.push(bodyRun(options.prefix, { bold: true }));
  children.push(...inlineChildren(node.children, { italics: options.italics }));
  return new Paragraph({
    children: children.length ? children : [bodyRun(plainText(node), { italics: options.italics })],
    indent: options.indent ? { left: options.indent } : undefined,
    spacing: { after: 180, line: 360 },
  });
}

function listChildren(node: MarkdownNode, depth = 0): FileChild[] {
  const output: FileChild[] = [];
  const start = node.start || 1;
  (node.children || []).forEach((item, index) => {
    const blocks = item.children || [];
    const paragraph = blocks.find((child) => child.type === "paragraph");
    const prefix = node.ordered ? `${start + index}. ` : "• ";
    if (paragraph) output.push(paragraphFrom(paragraph, { indent: 360 + depth * 360, prefix }));
    for (const child of blocks) {
      if (child === paragraph) continue;
      if (child.type === "list") output.push(...listChildren(child, depth + 1));
      else output.push(...blockChildren(child, depth + 1));
    }
  });
  return output;
}

function tableFrom(node: MarkdownNode) {
  const rows = (node.children || []).map((row, rowIndex) => new TableRow({
    tableHeader: rowIndex === 0,
    children: (row.children || []).map((cell) => new TableCell({
      shading: rowIndex === 0 ? { type: ShadingType.CLEAR, fill: "D9DDD4" } : undefined,
      margins: { top: 90, right: 110, bottom: 90, left: 110 },
      children: [new Paragraph({ children: inlineChildren(cell.children, { bold: rowIndex === 0 }), spacing: { after: 0 } })],
    })),
  }));
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, margins: { top: 80, right: 80, bottom: 80, left: 80 } });
}

function blockChildren(node: MarkdownNode, depth = 0): FileChild[] {
  if (node.type === "heading") {
    const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
    return [new Paragraph({ heading: levels[Math.max(0, Math.min(5, (node.depth || 1) - 1))], children: inlineChildren(node.children), spacing: { before: 240, after: 180 }, keepNext: true })];
  }
  if (node.type === "paragraph") return [paragraphFrom(node, { indent: depth * 240 })];
  if (node.type === "blockquote") return (node.children || []).flatMap((child) => child.type === "paragraph" ? [paragraphFrom(child, { indent: 480, italics: true })] : blockChildren(child, depth + 1));
  if (node.type === "list") return listChildren(node, depth);
  if (node.type === "code") {
    const runs = (node.value || "").split("\n").map((line, index) => new TextRun({ text: line || " ", break: index ? 1 : 0, font: "Consolas", size: 19 }));
    return [new Paragraph({ children: runs, shading: { type: ShadingType.CLEAR, fill: "E8EAE3" }, indent: { left: 220, right: 220 }, spacing: { before: 120, after: 220 } })];
  }
  if (node.type === "table") return [tableFrom(node)];
  if (node.type === "thematicBreak") return [new Paragraph({ border: { bottom: { color: "8D9690", style: BorderStyle.SINGLE, size: 6, space: 8 } }, spacing: { before: 180, after: 240 } })];
  if (node.type === "footnoteDefinition") return [new Paragraph({ children: [bodyRun(`[${node.identifier || "주석"}] `, { bold: true }), ...inlineChildren(node.children)], spacing: { after: 120 } })];
  if (node.children) return node.children.flatMap((child) => blockChildren(child, depth));
  const text = plainText(node).trim();
  return text ? [new Paragraph({ children: [bodyRun(text)], spacing: { after: 180 } })] : [];
}

export async function downloadDocx(markdown: string, title: string) {
  const root = unified().use(remarkParse).use(remarkGfm).parse(markdown) as unknown as MarkdownNode;
  const children = (root.children || []).flatMap((node) => blockChildren(node));
  const document = new Document({
    title,
    creator: "MD Books",
    description: "Exported from MD Books",
    styles: { default: { document: { run: { font: "Malgun Gothic", size: 22 }, paragraph: { spacing: { after: 180, line: 360 } } } } },
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children: children.length ? children : [new Paragraph({ children: [bodyRun(markdown)] })],
    }],
  });
  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(title)}.docx`;
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
