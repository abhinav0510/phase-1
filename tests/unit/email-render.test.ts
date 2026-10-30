import { describe, expect, it } from "vitest";
import {
  applyMergeFields,
  cleanFounderName,
  cleanSubject,
  escapeHtml,
  isValidEmail,
  parseEmailList,
  renderBroadcast,
} from "@/lib/email/render";

describe("email helpers", () => {
  it("escapes HTML", () => {
    expect(escapeHtml(`<script>"a" & 'b'</script>`)).toBe("&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;");
  });
  it("cleans founder names and falls back to there", () => {
    expect(cleanFounderName("Asha Rao (CEO)")).toBe("Asha Rao");
    expect(cleanFounderName("")).toBe("there");
    expect(cleanFounderName(null)).toBe("there");
  });
  it("fills merge fields however they are typed", () => {
    expect(applyMergeFields("Hi {{ founder_name }} of {{STARTUP_NAME}}", { founderName: "Asha", startupName: "Acme" })).toBe("Hi Asha of Acme");
    expect(applyMergeFields("{{startup_name}}", {})).toBe("your startup");
  });
  it("collapses line breaks in subjects, which blocks header injection", () => {
    expect(cleanSubject("Hello\r\nBcc: x@y.test  there")).toBe("Hello Bcc: x@y.test there");
  });
  it("validates addresses", () => {
    expect(isValidEmail("a.b+c@x-y.co.in")).toBe(true);
    for (const bad of ["a", "a@", "@x.com", "a@x", "a b@x.com"]) expect(isValidEmail(bad), bad).toBe(false);
  });
  it("parses address lists, lowercased, unique, with bad ones set aside", () => {
    const { valid, invalid } = parseEmailList("A@x.test, b@x.test; a@x.test\nnope");
    expect(valid).toEqual(["a@x.test", "b@x.test"]);
    expect(invalid).toEqual(["nope"]);
  });
});

describe("renderBroadcast", () => {
  const out = renderBroadcast({
    subject: "Update for {{startup_name}}",
    body: "Hi {{founder_name}},\n\nSee https://example.test/a\n\n<b>bold</b>",
    startupName: "Acme",
    founderName: "Asha Rao (CEO)",
  });
  it("personalises subject and body", () => {
    expect(out.subject).toBe("Update for Acme");
    expect(out.text).toContain("Hi Asha Rao,");
  });
  it("escapes what the admin typed, links URLs and signs off", () => {
    expect(out.html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(out.html).not.toContain("<b>bold</b>");
    expect(out.html).toContain('<a href="https://example.test/a"');
    expect(out.html).toContain("Team Sidana Ventures");
    expect(out.text).toMatch(/Sidana/);
  });
  it("leaves no merge field behind", () => {
    expect(out.html + out.text + out.subject).not.toContain("{{");
  });
});
