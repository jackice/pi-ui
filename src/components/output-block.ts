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
    const rows: string[] = [];
    for (const row of this.props.rows) {
      for (const logical of sanitizeSgr(row, this.props.ansi).split("\n")) {
        rows.push(...wrap(logical, limit));
      }
    }
    if (rows.length === 0) return [];
    const shown = this.props.preview.expanded
      ? rows
      : this.props.preview.direction === "head"
        ? rows.slice(0, this.props.preview.maxVisualRows)
        : rows.slice(rows.length - this.props.preview.maxVisualRows);
    const hidden = rows.length - shown.length;
    const summary = this.theme.fg("muted", `… ${hidden} more rows`);
    const result = hidden > 0
      ? this.props.preview.direction === "head" ? [...shown, summary] : [summary, ...shown]
      : shown;
    return result.map((row) => truncate(row, limit));
  }
}
