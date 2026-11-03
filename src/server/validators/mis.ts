import "server-only";

/** Private Storage bucket holding founders' MIS spreadsheets (MIGRATIONS/startup-mis.sql). */
export const MIS_BUCKET = "startup-mis";
// Uploads go through a server action and nginx, which cap the request at 4 MB.
export const MIS_MAX_BYTES = 3 * 1024 * 1024;

export interface SheetKind {
  mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/vnd.ms-excel";
  ext: "xlsx" | "xls";
}

const ascii = (s: string) => new TextEncoder().encode(s);

function contains(b: Uint8Array, needle: Uint8Array): boolean {
  outer: for (let i = 0; i + needle.length <= b.length; i++) {
    for (let j = 0; j < needle.length; j++) if (b[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/**
 * Identify an Excel file by its bytes, not its name. .xlsx is a zip holding xl/workbook.xml;
 * .xls is an OLE compound file. Macro workbooks (.xlsm) are refused.
 */
export function sniffSpreadsheet(b: Uint8Array): SheetKind | null {
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
    if (!contains(b, ascii("xl/workbook.xml")) || contains(b, ascii("xl/vbaProject.bin"))) return null;
    return { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" };
  }
  const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (b.length >= 8 && OLE.every((x, i) => b[i] === x)) {
    return { mime: "application/vnd.ms-excel", ext: "xls" };
  }
  return null;
}

/** The name shown in the portal and used for downloads: no folders, control characters or quotes. */
export function cleanFileName(name: string, ext: SheetKind["ext"]): string {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "")
    .replace(/\.(xlsx|xls)$/i, "")
    .trim()
    .slice(0, 100);
  return `${base || "MIS"}.${ext}`;
}
