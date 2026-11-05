// Carry a short confirmation across a full page reload. Uploads that redraw server charts
// reload the page instead of refreshing it in place, because Next.js can stall while
// streaming the updated page into the open tab. Storage can be blocked, so both sides
// are best-effort: the reload still happens, and the page still works without the note.

const KEY = "sv:notice:";

export function reloadWithNotice(scope: string, text: string): void {
  try {
    sessionStorage.setItem(KEY + scope, text);
  } catch {
    // Private mode or blocked storage: reload without the note.
  }
  window.location.reload();
}

/** The note left before the reload, once; null when there is none. */
export function takeNotice(scope: string): string | null {
  try {
    const text = sessionStorage.getItem(KEY + scope);
    if (text !== null) sessionStorage.removeItem(KEY + scope);
    return text;
  } catch {
    return null;
  }
}
