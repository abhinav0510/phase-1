// Broadcast email rendering. Pure + isomorphic: the admin composer uses it for
// the live preview and the server uses it to build what is actually sent, so
// the preview is exactly the email.
//
// The admin writes PLAIN TEXT. Everything is HTML-escaped before it is placed in
// the template, so a message can never inject markup into the email. Blank lines
// become paragraphs, single newlines become <br>, and bare http(s) links are
// made clickable.

export const MERGE_FIELDS = ["{{founder_name}}", "{{startup_name}}"] as const;

export interface RenderInput {
  subject: string;
  body: string;
  startupName?: string | null;
  founderName?: string | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const SIGNOFF_TEXT = [
  "Warm regards,",
  "Team Sidana Ventures",
  "",
  "SIDANA VENTURES LLP",
  "424A Tower B3, Spaze iTech Park, Sector 49, Sohna Road, Gurgaon, Haryana 122022",
  "www.sidanaventures.com",
].join("\n");

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Greeting-friendly founder name, the same cleanup the weekly report uses. */
export function cleanFounderName(name: string | null | undefined): string {
  const cleaned = String(name ?? "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "there";
}

/** Replace {{founder_name}} / {{startup_name}} (case/space-insensitive). */
export function applyMergeFields(
  s: string,
  vars: { startupName?: string | null; founderName?: string | null },
): string {
  return s
    .replace(/\{\{\s*founder_name\s*\}\}/gi, cleanFounderName(vars.founderName))
    .replace(
      /\{\{\s*startup_name\s*\}\}/gi,
      (vars.startupName ?? "").trim() || "your startup",
    );
}

/** Subjects are a single header line: collapse any line breaks. */
export function cleanSubject(s: string): string {
  return s.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function bodyToHtml(text: string): string {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs
    .map((p) => {
      const inner = escapeHtml(p)
        .replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1" style="color:#1a5fb4;">$1</a>',
        )
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 14px 0;">${inner}</p>`;
    })
    .join("");
}

const SIGNATURE_HTML =
  "<p style='margin:22px 0 4px 0;'>Warm regards,<br><b>Team Sidana Ventures</b></p>" +
  "<br>--<br><img src='https://drive.google.com/uc?export=view&id=1iLMGooCx6B8bmYJxlYMdNg0YhdSoFAFi' alt='Sidana Ventures' width='120' style='display:block;margin-bottom:8px;border:0;'>" +
  "<div style='font-family:Arial,sans-serif;font-size:13px;color:#333333;line-height:1.4;'>" +
  "<span style='font-weight:bold;'>SIDANA VENTURES LLP</span><br>" +
  "424A Tower B3, Spaze iTech Park, Sector 49, Sohna Road<br>Gurgaon, Haryana 122022<br>" +
  "<a href='https://www.sidanaventures.com' style='color:#1a5fb4;'>www.sidanaventures.com</a></div>";

export function renderBroadcast(input: RenderInput): RenderedEmail {
  const vars = { startupName: input.startupName, founderName: input.founderName };
  const subject = cleanSubject(applyMergeFields(input.subject, vars));
  const body = applyMergeFields(input.body, vars).trim();

  const html =
    "<div style='font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#222222;max-width:640px;'>" +
    bodyToHtml(body) +
    SIGNATURE_HTML +
    "</div>";
  const text = `${body}\n\n${SIGNOFF_TEXT}\n`;
  return { subject, html, text };
}

const EMAIL_RE = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

export function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s);
}

/** Parse a free-form list ("a@x.com, b@y.com; c@z.com") into unique, valid, lowercased emails. */
export function parseEmailList(raw: string): { valid: string[]; invalid: string[] } {
  const parts = raw
    .split(/[\s,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (isValidEmail(p)) {
      if (!valid.includes(p)) valid.push(p);
    } else if (!invalid.includes(p)) {
      invalid.push(p);
    }
  }
  return { valid, invalid };
}
