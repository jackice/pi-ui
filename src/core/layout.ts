import { displayWidth, normalizeWidth, pad, truncate } from "./ansi.js";

export interface Renderable {
  render(width: number): readonly string[];
  invalidate?(): void;
}

export type BorderStyle = "none" | "rounded" | "square";

export interface BorderChars {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
}

export const BORDERS: Readonly<Record<Exclude<BorderStyle, "none">, BorderChars>> = {
  rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
  },
  square: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
  },
};

export { normalizeWidth };

export function rule(width: number, char = "─"): string {
  const limit = normalizeWidth(width);
  return char.repeat(limit);
}

export function joinSides(left: string, right: string, width: number, minGap = 1): string {
  const limit = normalizeWidth(width);
  if (limit === 0) return "";

  const rightWidth = displayWidth(right);
  if (rightWidth >= limit) return truncate(right, limit);

  const availableLeft = limit - rightWidth;
  if (availableLeft <= minGap) {
    return " ".repeat(availableLeft) + right;
  }

  const leftBudget = availableLeft - minGap;
  const leftText = truncate(left, leftBudget);
  const gap = limit - displayWidth(leftText) - rightWidth;
  return leftText + " ".repeat(Math.max(0, gap)) + right;
}

export function fitLine(text: string, width: number): string {
  return pad(truncate(text, width), width);
}

export function renderChildLines(children: readonly Renderable[], width: number): string[] {
  const lines: string[] = [];
  const limit = normalizeWidth(width);
  if (limit === 0) return lines;

  for (const child of children) {
    for (const line of child.render(limit)) {
      lines.push(truncate(line, limit));
    }
  }
  return lines;
}
