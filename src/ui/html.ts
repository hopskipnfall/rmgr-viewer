const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes text for HTML element content AND quoted attribute values. (The older
 * `textContent`/`innerHTML` helpers in some views don't escape quotes, so they aren't safe inside
 * `attr="..."`: a player name or note containing `"` would end the attribute early.)
 */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);
}
