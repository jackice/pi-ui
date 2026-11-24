export type Tone =
  | "text"
  | "muted"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "border"
  | "added"
  | "removed";

export interface UiTheme {
  fg(tone: Tone, text: string): string;
  bold(text: string): string;
}

export interface ThemeLike {
  fg(token: string, text: string): string;
  bold(text: string): string;
}

export const TONE_TO_TOKEN: Readonly<Record<Tone, string>> = {
  text: "text",
  muted: "muted",
  accent: "accent",
  success: "success",
  warning: "warning",
  error: "error",
  border: "border",
  added: "success",
  removed: "error",
};

export function fromPiTheme(theme: ThemeLike): UiTheme {
  return {
    fg(tone, text) {
      try {
        return theme.fg(TONE_TO_TOKEN[tone], text);
      } catch {
        return text;
      }
    },
    bold(text) {
      try {
        return theme.bold(text);
      } catch {
        return text;
      }
    },
  };
}

export function plainTheme(): UiTheme {
  return {
    fg: (_tone, text) => text,
    bold: (text) => text,
  };
}
