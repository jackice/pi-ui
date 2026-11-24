import {
  replaceControlCharacters,
  sliceByColumn,
  stripTerminalSequences,
  truncateToWidth,
  visibleWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";

const ELLIPSIS = "…";
const ESCAPE = "\x1b";

export function displayWidth(text: string): number {
  return visibleWidth(text);
}

export function sanitizeLine(text: string): string {
  return sanitizeText(text);
}

export function sanitizeText(text: string): string {
  const withoutDcs = stripTerminalSequences(text)
    .replace(/\x1bP[\s\S]*?(?:\x1b\\|\x07|$)/g, "")
    .replace(/\x90[\s\S]*?(?:\x9c|\x07|$)/g, "");
  return withoutDcs
    .split("\n")
    .map((line) => replaceControlCharacters(line))
    .join("\n");
}

export function truncate(text: string, width: number, ellipsis = ELLIPSIS): string {
  const limit = normalizeWidth(width);
  if (limit === 0) return "";
  if (displayWidth(text) <= limit) return text;
  if (text.includes(ESCAPE)) return truncateToWidth(text, limit, ellipsis);

  const ellipsisWidth = displayWidth(ellipsis);
  if (ellipsisWidth >= limit) return sliceByColumn(ellipsis, 0, limit, true);
  return sliceByColumn(text, 0, limit - ellipsisWidth, true) + ellipsis;
}

export function pad(text: string, width: number, align: "left" | "right" | "center" = "left"): string {
  const limit = normalizeWidth(width);
  if (limit === 0) return "";
  const current = displayWidth(text);
  if (current >= limit) return hardTruncate(text, limit);
  const missing = limit - current;
  if (align === "right") return " ".repeat(missing) + text;
  if (align === "center") {
    const left = Math.floor(missing / 2);
    return " ".repeat(left) + text + " ".repeat(missing - left);
  }
  return text + " ".repeat(missing);
}

function hardTruncate(text: string, width: number): string {
  if (text.includes(ESCAPE)) return truncateToWidth(text, width, "");
  return sliceByColumn(text, 0, width, true);
}

export function wrap(text: string, width: number): string[] {
  const limit = normalizeWidth(width);
  if (limit === 0) return [];
  return wrapTextWithAnsi(text, limit);
}

export function middleTruncate(text: string, width: number, ellipsis = ELLIPSIS): string {
  const limit = normalizeWidth(width);
  if (limit === 0) return "";
  if (displayWidth(text) <= limit) return text;

  const ellipsisWidth = displayWidth(ellipsis);
  if (ellipsisWidth >= limit) return sliceByColumn(ellipsis, 0, limit, true);

  const tailWidth = limit - ellipsisWidth;
  const total = displayWidth(text);
  const tail = sliceByColumn(text, total - tailWidth, tailWidth, true);
  return ellipsis + tail;
}

export function normalizeWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0;
  return Math.floor(width);
}
