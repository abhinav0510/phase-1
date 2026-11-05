// Reads .xlsx files without dependencies: an .xlsx file is a zip of XML files.
// Plain JavaScript, with no "server-only" marker, so the import scripts can use it
// as well as the app's server code. Never import it from client code.

import { inflateRawSync } from "node:zlib";

/** The files inside a zip, as name -> bytes. Handles stored and deflated entries. */
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not an .xlsx file (no zip directory found)");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Broken zip directory");
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files.set(name, method === 8 ? inflateRawSync(raw) : raw);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const unescape = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
const texts = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join("");
const colIndex = (ref) => [...ref.replace(/\d+/g, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

function sharedStrings(files) {
  return files.has("xl/sharedStrings.xml")
    ? [...files.get("xl/sharedStrings.xml").toString("utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]))
    : [];
}

function sheetRows(xml, shared) {
  const rows = [];
  for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const body = c[2] ?? "";
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      const text = type === "inlineStr" ? texts(body) : type === "s" ? shared[Number(v)] ?? "" : v === undefined ? "" : unescape(v);
      cells[colIndex(ref)] = text;
    }
    rows.push(Array.from(cells, (x) => x ?? ""));
  }
  return rows;
}

/** The first sheet's rows, as arrays of cell text ("" for empty cells). */
export function readXlsxRows(buf) {
  const files = unzip(buf);
  const sheet = files.get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("The spreadsheet has no first sheet");
  return sheetRows(sheet.toString("utf8"), sharedStrings(files));
}

/** Every sheet's rows, by the tab name shown in Excel. */
export function readXlsxSheets(buf) {
  const files = unzip(buf);
  const workbook = files.get("xl/workbook.xml")?.toString("utf8");
  const rels = files.get("xl/_rels/workbook.xml.rels")?.toString("utf8") ?? "";
  if (!workbook) throw new Error("Not an .xlsx workbook");
  const targets = new Map(
    [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => [/\bId="([^"]+)"/.exec(m[0])?.[1], /\bTarget="([^"]+)"/.exec(m[0])?.[1]]),
  );
  const shared = sharedStrings(files);
  const sheets = new Map();
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = unescape(/\bname="([^"]*)"/.exec(m[0])?.[1] ?? "");
    const target = targets.get(/\br:id="([^"]+)"/.exec(m[0])?.[1]);
    if (!target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    const xml = files.get(path);
    if (xml) sheets.set(name, sheetRows(xml.toString("utf8"), shared));
  }
  return sheets;
}
