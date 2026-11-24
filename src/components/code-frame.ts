import { normalizeWidth, sanitizeLine, truncate, wrap } from "../core/ansi.js";
import type { Tone, UiTheme } from "../core/theme.js";
import type { DiffHunk, DiffLine } from "../diff/types.js";

export interface CodeFrameProps {
  hunks: readonly DiffHunk[];
  expanded?: boolean;
  maxHunks?: number;
  maxLines?: number;
  sourceTruncated?: boolean;
  indentGuides?: boolean;
  tabWidth?: number;
}

const EMPTY_LINES: readonly string[] = [];
const DEFAULTS = { maxHunks: 3, maxLines: 30, tabWidth: 4 } as const;

export class CodeFrame {
  private props: CodeFrameProps;
  private theme: UiTheme;
  private revision = 0;
  private cache: { width: number; revision: number; lines: readonly string[] } | undefined;

  constructor(theme: UiTheme, props: CodeFrameProps) {
    this.theme = theme;
    this.props = props;
  }

  setProps(props: Partial<CodeFrameProps>): void {
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
    const lines = this.build(limit);
    this.cache = { width: limit, revision: this.revision, lines };
    return lines;
  }

  private build(width: number): readonly string[] {
    const expanded = this.props.expanded === true;
    const maxHunks = expanded ? Number.POSITIVE_INFINITY : positive(this.props.maxHunks, DEFAULTS.maxHunks);
    const maxLines = expanded ? Number.POSITIVE_INFINITY : positive(this.props.maxLines, DEFAULTS.maxLines);
    const tabWidth = positive(this.props.tabWidth, DEFAULTS.tabWidth);
    const hunks = this.props.hunks;

    let totalLines = 0;
    let maxOld = 0;
    let maxNew = 0;
    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.kind !== "gap") totalLines++;
        if (line.oldLine !== undefined) maxOld = Math.max(maxOld, line.oldLine);
        if (line.newLine !== undefined) maxNew = Math.max(maxNew, line.newLine);
      }
    }

    const oldWidth = Math.max(1, String(maxOld).length);
    const newWidth = Math.max(1, String(maxNew).length);
    const prefixWidth = oldWidth + newWidth + 6;
    const compact = width < prefixWidth + 4;

    const rows: DiffLine[] = [];
    let shownLines = 0;
    let shownHunks = 0;

    for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
      if (shownHunks >= maxHunks) break;
      const hunk = hunks[hunkIndex];
      if (hunk === undefined) break;
      if (hunkIndex > 0 && hunk.lines[0]?.kind !== "gap") {
        rows.push({ kind: "gap", content: "" });
      }

      let completed = true;
      for (const line of hunk.lines) {
        if (line.kind !== "gap") {
          if (shownLines >= maxLines) {
            completed = false;
            break;
          }
          shownLines++;
        }
        rows.push(line);
      }
      if (!completed) break;
      shownHunks++;
    }

    const hiddenLines = Math.max(0, totalLines - shownLines);
    const hiddenHunks = Math.max(0, hunks.length - shownHunks);
    const folded = !expanded && (hiddenLines > 0 || hiddenHunks > 0);

    const lines: string[] = [];
    for (const line of rows) {
      if (line.kind === "gap") {
        lines.push(this.renderGap(width, oldWidth, newWidth, compact));
      } else {
        lines.push(...this.renderLine(line, width, oldWidth, newWidth, prefixWidth, compact, tabWidth));
      }
    }

    if (this.props.sourceTruncated === true) {
      lines.push(...notice(this.theme, width, "结果已截断，仅显示已保存内容"));
    }
    if (folded) {
      lines.push(...notice(this.theme, width, `已折叠 ${hiddenLines} 行（展开查看）`));
    }
    return lines;
  }

  private renderGap(width: number, oldWidth: number, newWidth: number, compact: boolean): string {
    if (compact) return truncate(this.theme.fg("muted", "⋯"), width);
    const blank = " ".repeat(oldWidth + newWidth + 2);
    return truncate(
      blank + this.theme.fg("border", "│") + " " + this.theme.fg("muted", "⋯"),
      width,
    );
  }

  private renderLine(
    line: DiffLine,
    width: number,
    oldWidth: number,
    newWidth: number,
    prefixWidth: number,
    compact: boolean,
    tabWidth: number,
  ): string[] {
    const tone: Tone = line.kind === "added" ? "success" : line.kind === "removed" ? "error" : "text";
    const marker = line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " ";
    const content = renderContent(line.content, this.props.indentGuides === true, tabWidth);

    if (compact) {
      if (width <= 2) return [truncate(this.theme.fg(tone, marker), width)];
      const contentWidth = width - 2;
      const parts = wrap(content, contentWidth);
      const out = [`${this.theme.fg(tone, marker)} ${this.theme.fg(tone, parts[0] ?? "")}`];
      for (const part of parts.slice(1)) out.push(`  ${this.theme.fg(tone, part)}`);
      return out.map((value) => truncate(value, width));
    }

    const contentWidth = Math.max(1, width - prefixWidth);
    const parts = wrap(content, contentWidth);
    const oldText = line.oldLine === undefined ? " ".repeat(oldWidth) : String(line.oldLine).padStart(oldWidth);
    const newText = line.newLine === undefined ? " ".repeat(newWidth) : String(line.newLine).padStart(newWidth);
    const numbers =
      this.theme.fg("muted", oldText) +
      " " +
      this.theme.fg("muted", newText) +
      " " +
      this.theme.fg("border", "│") +
      " ";
    const first = numbers + this.theme.fg(tone, marker) + " " + this.theme.fg(tone, parts[0] ?? "");
    const out = [truncate(first, width)];

    if (parts.length > 1) {
      const continuation =
        " ".repeat(oldWidth + newWidth + 2) +
        this.theme.fg("border", "│") +
        " " +
        this.theme.fg("muted", "↪") +
        " ";
      for (const part of parts.slice(1)) {
        out.push(truncate(continuation + this.theme.fg(tone, part), width));
      }
    }
    return out;
  }
}

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function renderContent(text: string, indentGuides: boolean, tabWidth: number): string {
  let result = sanitizeLine(expandTabs(text, tabWidth));
  if (!indentGuides) return result;
  const leading = /^ +/.exec(result);
  if (leading === null) return result;
  result = leading[0].replace(/ {2}/g, "· ") + result.slice(leading[0].length);
  return result;
}

function expandTabs(text: string, tabWidth: number): string {
  if (!text.includes("\t")) return text;
  let out = "";
  let column = 0;
  for (const char of text) {
    if (char !== "\t") {
      out += char;
      column++;
      continue;
    }
    const spaces = tabWidth - (column % tabWidth);
    out += "→" + " ".repeat(Math.max(0, spaces - 1));
    column += spaces;
  }
  return out;
}

function notice(theme: UiTheme, width: number, text: string): string[] {
  return wrap(theme.fg("muted", text), width).map((line) => truncate(line, width));
}
