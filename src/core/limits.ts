export const UI_MAX_BYTES = 1024 * 1024;
export const UI_MAX_LINES = 20000;

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function clampUtf8(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  if (bytes.length <= maxBytes) return { text, truncated: false };
  const decoded = new TextDecoder().decode(bytes.slice(0, Math.max(0, maxBytes))).replace(/\uFFFD+$/u, "").replace(/\p{M}+$/u, "");
  return { text: decoded, truncated: true };
}

export function clampChars(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  let cut = text.slice(0, maxChars);
  if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
  return { text: cut.replace(/\p{M}+$/u, ""), truncated: true };
}
