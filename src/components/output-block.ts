import { normalizeWidth, truncate, wrap } from "../core/ansi.js";
import type { UiTheme } from "../core/theme.js";
import { sanitizeSgr } from "../core/safe-sgr.js";

export interface OutputPreviewPolicy {
  direction: "head" | "tail";
  maxVisualRows: number;
  expanded: boolean;
}

export interface OutputBlockProps {
  rows: readonly string[];
  ansi: boolean;
  preview: OutputPreviewPolicy;
  theme?: UiTheme;
}

export class OutputBlock {
  private props: OutputBlockProps;
  private theme: UiTheme;

  constructor(theme: UiTheme, props: OutputBlockProps) {
    this.theme = theme;
    this.props = props;
  }

  setProps(props: Partial<OutputBlockProps>): void {
    this.props = { ...this.props, ...props };
  }

  setTheme(theme: UiTheme): void {
    this.theme = theme;
  }

  render(width: number): readonly string[] {
    const limit = normalizeWidth(width);
    if (limit === 0) return [];
    let safety = false;
    const source: string[] = [];
    let bytes = 0;
    for (const row of this.props.rows) {
      if (source.length >= 20000 || bytes >= 1024 * 1024) {
        safety = true;
        break;
      }
      source.push(row);
      bytes += row.length;
    }
    const rows: string[] = [];
    for (const row of source) {
      const parts = row.split(/\r\n|\n/);
      if (parts.at(-1) === "") parts.pop();
      for (const part of parts) {
        if (rows.length >= 20000) {
          safety = true;
          break;
        }
        rows.push(...wrap(sanitizeSgr(part, this.props.ansi), limit));
      }
      if (safety) break;
    }
    if (rows.length === 0) return [];
    const shown = this.props.preview.expanded
      ? rows
      : this.props.preview.direction === "head"
        ? rows.slice(0, this.props.preview.maxVisualRows)
        : rows.slice(rows.length - this.props.preview.maxVisualRows);
    const hidden = rows.length - shown.length;
    const summaryText = safety
      ? "UI safety limit — available result not fully shown"
      : `… ${hidden} more rows`;
    const summary = this.theme.fg("muted", summaryText);
    const result = hidden > 0 || safety
      ? this.props.preview.direction === "head" ? [...shown, summary] : [summary, ...shown]
      : shown;
    return result.map((row) => truncate(row, limit));
  }
}
