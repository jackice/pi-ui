export const UI_MAX_BYTES = 1024 * 1024;
export const UI_MAX_LINES = 20000;

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function clampUtf8(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  if (bytes.length <= maxBytes) return { text, truncated: false };
  let decoded = new TextDecoder().decode(bytes.slice(0, Math.max(0, maxBytes)))
    .replace(/\uFFFD+$/u, "")
    .replace(/\p{M}+$/u, "")
    .replace(/[\u200D\uFE0F]+$/u, "");
  const chars = [...decoded];
  let regional = 0;
  for (let index = chars.length - 1; index >= 0; index--) {
    const code = chars[index]?.codePointAt(0) ?? 0;
    if (code >= 0x1f1e6 && code <= 0x1f1ff) regional++;
    else break;
  }
  if (regional % 2 === 1) decoded = chars.slice(0, -1).join("");
  return { text: decoded, truncated: true };
}

export function takeLines(text: string, maxLines: number): { lines: string[]; truncated: boolean } {
  const lines: string[] = [];
  let start = 0;
  while (lines.length < maxLines) {
    const index = text.indexOf("\n", start);
    if (index < 0) {
      lines.push(text.slice(start));
      return { lines, truncated: false };
    }
    const value = text.slice(start, index);
    lines.push(value.endsWith("\r") ? value.slice(0, -1) : value);
    start = index + 1;
  }
  return { lines, truncated: start < text.length };
}

export function clampChars(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  let cut = text.slice(0, maxChars);
  if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
  return { text: cut.replace(/\p{M}+$/u, ""), truncated: true };
}
