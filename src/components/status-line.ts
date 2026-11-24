import { displayWidth, middleTruncate, normalizeWidth, pad, sanitizeLine, truncate } from "../core/ansi.js";
import type { Tone, UiTheme } from "../core/theme.js";

export interface StatusLineProps {
  icon?: string;
  title: string;
  path?: string;
  meta?: string;
  tone?: Tone;
  iconTone?: Tone;
  metaTone?: Tone;
  pathTone?: Tone;
  gap?: number;
}

const EMPTY_LINES: readonly string[] = [];

export class StatusLine {
  private props: StatusLineProps;
  private theme: UiTheme;
  private revision = 0;
  private cache: { width: number; revision: number; lines: readonly string[] } | undefined;

  constructor(theme: UiTheme, props: StatusLineProps) {
    this.theme = theme;
    this.props = props;
  }

  setProps(props: Partial<StatusLineProps>): void {
    this.props = { ...this.props, ...props };
    this.invalidate();
  }

  setTheme(theme: UiTheme): void {
    this.theme = theme;
    this.invalidate();
  }

  invalidate(): void {
    this.revision++;
    this.cache = undefined;
  }

  render(width: number): readonly string[] {
    const limit = normalizeWidth(width);
    if (limit === 0) return EMPTY_LINES;
    if (this.cache && this.cache.width === limit && this.cache.revision === this.revision) {
      return this.cache.lines;
    }

    const lines = [this.build(limit)];
    this.cache = { width: limit, revision: this.revision, lines };
    return lines;
  }

  private build(width: number): string {
    const icon = sanitizeLine(this.props.icon ?? "");
    const title = sanitizeLine(this.props.title);
    const path = sanitizeLine(this.props.path ?? "");
    const meta = sanitizeLine(this.props.meta ?? "");
    const gap = Math.max(0, Math.floor(this.props.gap ?? 1));

    const metaColored = meta.length > 0 ? this.theme.fg(this.props.metaTone ?? "muted", meta) : "";
    const metaWidth = displayWidth(metaColored);
    if (metaWidth >= width) return pad(truncate(metaColored, width), width);

    const reserved = metaWidth + (metaWidth > 0 ? gap : 0);
    let leftBudget = width - reserved;
    if (leftBudget <= 0) return pad("", width - metaWidth) + metaColored;

    const parts: string[] = [];

    if (icon.length > 0) {
      const cost = displayWidth(icon) + (parts.length > 0 ? 1 : 0);
      if (cost <= leftBudget) {
        parts.push(this.theme.fg(this.props.iconTone ?? "accent", icon));
        leftBudget -= cost;
      }
    }

    if (title.length > 0) {
      const separator = parts.length > 0 ? 1 : 0;
      const budget = leftBudget - separator;
      if (budget > 0) {
        const text = truncate(title, budget);
        parts.push(this.theme.fg(this.props.tone ?? "text", text));
        leftBudget -= displayWidth(text) + separator;
      }
    }

    if (path.length > 0 && leftBudget > 1) {
      const text = middleTruncate(path, leftBudget - 1);
      parts.push(this.theme.fg(this.props.pathTone ?? "muted", text));
    }

    const left = pad(parts.join(" "), width - reserved);
    const line = metaWidth > 0 ? left + " ".repeat(gap) + metaColored : left;
    return pad(line, width);
  }
}
