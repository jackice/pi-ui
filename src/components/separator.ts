import { sanitizeLine } from "../core/ansi.js";
import type { Tone, UiTheme } from "../core/theme.js";

export type SeparatorStyle = "ascii" | "pipe" | "slash" | "dot" | "none";

const SEPARATOR_TEXT: Readonly<Record<SeparatorStyle, string>> = {
  ascii: " > ",
  pipe: " | ",
  slash: " / ",
  dot: " · ",
  none: "",
};

export function separatorText(style: SeparatorStyle): string {
  return SEPARATOR_TEXT[style] ?? "";
}

export function renderSeparator(style: SeparatorStyle, theme: UiTheme, tone: Tone = "muted"): string {
  const text = sanitizeLine(separatorText(style));
  return text.length === 0 ? "" : theme.fg(tone, text);
}
