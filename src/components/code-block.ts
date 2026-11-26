import { normalizeWidth, sanitizeLine, truncate, wrap } from "../core/ansi.js";
import { UI_MAX_BYTES, UI_MAX_LINES, clampChars, clampUtf8, takeLines, utf8Bytes } from "../core/limits.js";
import type { UiTheme } from "../core/theme.js";

export interface SourceLine {
  text: string;
  number: number | null;
}

export interface PreviewPolicy {
  direction: "head" | "tail";
  maxLogicalLines?: number;
  maxVisualRows: number;
  expanded: boolean;
  hideCount?: boolean;
}

export type Highlight = (code: string, language: string | undefined) => readonly string[];

const HIGHLIGHT_MAX_LINES = 10_000;
const HIGHLIGHT_MAX_BYTES = 256 * 1024;

export interface CodeBlockProps {
  lines: readonly SourceLine[];
  language?: string;
  highlight?: Highlight;
  showLineNumbers: boolean;
  preview: PreviewPolicy;
}

export class CodeBlock {
  private props: CodeBlockProps;
  private theme: UiTheme;

  constructor(theme: UiTheme, props: CodeBlockProps) {
    this.theme = theme;
    this.props = props;
  }

  setProps(props: Partial<CodeBlockProps>): void {
    this.props = { ...this.props, ...props };
  }

  setTheme(theme: UiTheme): void {
    this.theme = theme;
  }

  render(width: number): readonly string[] {
    const limit = normalizeWidth(width);
    if (limit === 0) return [];
    const { preview, showLineNumbers } = this.props;
    const all = this.props.lines;
    let selected = all;
    let hidden = 0;
    let safety = false;
    if (!preview.expanded && preview.maxLogicalLines !== undefined) {
      const max = Math.max(0, preview.maxLogicalLines);
      hidden = Math.max(0, all.length - max);
      selected = preview.direction === "head" ? all.slice(0, max) : all.slice(all.length - max);
    }
    const bounded: SourceLine[] = [];
    let bytes = 0;
    for (const line of selected) {
      if (bounded.length >= UI_MAX_LINES || bytes >= UI_MAX_BYTES) {
        safety = true;
        break;
      }
      const clamped = clampUtf8(line.text, UI_MAX_BYTES - bytes);
      if (clamped.truncated) safety = true;
      bounded.push({ ...line, text: clamped.text });
      bytes += utf8Bytes(clamped.text);
    }
    selected = bounded;
    if (selected.length === 0) return [];

    const highlightLimit = preview.expanded ? Math.min(selected.length, 200) : selected.length;
    let highlighted: readonly string[] | undefined;
    if (this.props.highlight !== undefined && highlightLimit > 0 && highlightLimit <= HIGHLIGHT_MAX_LINES) {
      try {
        const source = selected.slice(0, highlightLimit).map((line) => sanitizeLine(line.text)).join("\n");
        if (utf8Bytes(source) <= HIGHLIGHT_MAX_BYTES) {
          const result = this.props.highlight(source, this.props.language);
          if (result.length === highlightLimit) highlighted = result;
        }
      } catch {
        // 高亮失败时使用纯文本。
      }
    }

    const digits = showLineNumbers
      ? Math.max(1, ...selected.map((line) => (line.number === null ? 1 : String(line.number).length)))
      : 0;
    const gutter = showLineNumbers ? digits + 1 : 0;
    const available = Math.max(1, limit - gutter);
    const rows: string[] = [];
    const charCap = UI_MAX_LINES * available;
    for (const [lineIndex, line] of selected.entries()) {
      if (rows.length >= UI_MAX_LINES) {
        safety = true;
        break;
      }
      const boundedLine = clampChars(line.text, charCap);
      if (boundedLine.truncated) safety = true;
      const limited = takeLines(boundedLine.text, UI_MAX_LINES);
      if (limited.truncated) safety = true;
      const styledPieces = highlighted?.[lineIndex] !== undefined && !boundedLine.truncated && !limited.truncated
        ? (highlighted[lineIndex] ?? "").split("\n")
        : undefined;
      for (const [pieceIndex, piece] of limited.lines.entries()) {
        const visuals = wrap(styledPieces?.[pieceIndex] ?? sanitizeLine(piece), available);
        if (rows.length + visuals.length > UI_MAX_LINES) {
          rows.push(...visuals.slice(0, UI_MAX_LINES - rows.length));
          safety = true;
          break;
        }
        for (const [index, visual] of visuals.entries()) {
          const prefix = showLineNumbers
            ? (index === 0 && pieceIndex === 0 && line.number !== null ? String(line.number).padStart(digits) : " ".repeat(digits)) + " "
            : "";
          rows.push(this.theme.fg("text", prefix + visual));
        }
      }
    }
    const maxRows = preview.expanded ? Number.POSITIVE_INFINITY : preview.maxVisualRows;
    const visualHidden = Math.max(0, rows.length - maxRows);
    let visible = rows;
    if (visualHidden > 0) {
      visible = preview.direction === "head" ? rows.slice(0, maxRows) : rows.slice(rows.length - maxRows);
    }
    const truncated = hidden > 0 || visualHidden > 0 || safety;
    const summaryText = safety || preview.hideCount === true
      ? "UI safety limit — available result not fully shown"
      : hidden > 0 && visualHidden === 0
        ? `… ${hidden} more lines`
        : "… partial content not shown";
    const summary = this.theme.fg("muted", summaryText);
    const result = truncated
      ? preview.direction === "head" ? [...visible, summary] : [summary, ...visible]
      : visible;
    return result.map((row) => truncate(row, limit));
  }
}
