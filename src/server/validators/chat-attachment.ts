import "server-only";

import { sniffImage } from "./logo";

/** Private Storage bucket for chat attachments (MIGRATIONS/015-chat.sql). */
export const CHAT_BUCKET = "chat-attachments";
// Uploads go through a server action and nginx, which cap the request at 4 MB.
export const CHAT_MAX_BYTES = 3 * 1024 * 1024;

export interface AttachmentKind {
  mime: string;
  ext: string;
  /** Shown inline in the chat (images); everything else is a download. */
  inline: boolean;
}

const ascii = (s: string) => new TextEncoder().encode(s);
function contains(b: Uint8Array, needle: Uint8Array): boolean {
  outer: for (let i = 0; i + needle.length <= b.length; i++) {
    for (let j = 0; j < needle.length; j++) if (b[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const OLE_TYPES: Record<string, string> = { xls: "application/vnd.ms-excel", doc: "application/msword", ppt: "application/vnd.ms-powerpoint" };

/**
 * Identify a chat attachment by its bytes (and, for old Office files and CSV,
 * its extension). Images, PDF, Excel, Word, PowerPoint and CSV only; macro-enabled
 * Office files, executables, HTML and SVG are refused.
 */
export function sniffAttachment(b: Uint8Array, fileName: string): AttachmentKind | null {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const img = sniffImage(b);
  if (img) return { mime: img.mime, ext: img.ext, inline: true };
  if (b.length >= 6 && String.fromCharCode(...b.slice(0, 6)) === "GIF89a") return { mime: "image/gif", ext: "gif", inline: true };
  if (b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-") return { mime: "application/pdf", ext: "pdf", inline: false };

  // Office Open XML files are zips; the part inside says which kind. Macro parts are refused.
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
    if (contains(b, ascii("vbaProject.bin"))) return null;
    if (contains(b, ascii("xl/workbook.xml"))) return { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx", inline: false };
    if (contains(b, ascii("word/document.xml"))) return { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx", inline: false };
    if (contains(b, ascii("ppt/presentation.xml"))) return { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: "pptx", inline: false };
    return null;
  }
  // Older .xls / .doc / .ppt share one container format, so the extension picks the type.
  if (b.length >= 8 && OLE.every((x, i) => b[i] === x) && OLE_TYPES[ext]) {
    return { mime: OLE_TYPES[ext], ext, inline: false };
  }
  // CSV: plain text with no NUL bytes, named .csv.
  if (ext === "csv" && b.length > 0 && !b.slice(0, 4096).includes(0)) return { mime: "text/csv", ext: "csv", inline: false };
  return null;
}

/** The name shown in the chat and used for downloads: no folders, control characters or quotes. */
export function cleanAttachmentName(name: string, ext: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "")
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .trim()
    .slice(0, 100);
  return `${base || "attachment"}.${ext}`;
}
