import { sanitizeLine, truncate } from "../core/ansi.ts";
import { Panel, type Renderable } from "./panel.ts";
import type { Tone, UiTheme } from "../core/theme.ts";

export type ToolStatus = "pending" | "streaming" | "running" | "success" | "error" | "unknown";

export interface ToolCardSection {
  title?: string;
  rows: readonly string[];
}

export interface ToolCardProps {
  title: string;
  status: ToolStatus;
  meta?: readonly string[];
  sections?: readonly ToolCardSection[];
}

const STATUS: Readonly<Record<ToolStatus, { glyph: string; tone: Tone }>> = {
  pending: { glyph: "○", tone: "muted" },
  streaming: { glyph: "●", tone: "accent" },
  running: { glyph: "●", tone: "accent" },
  success: { glyph: "✓", tone: "success" },
  error: { glyph: "✗", tone: "error" },
  unknown: { glyph: "?", tone: "muted" },
};

export class ToolCard {
  private props: ToolCardProps;
  private theme: UiTheme;
  private revision = 0;
  private cache: { width: number; revision: number; lines: readonly string[] } | undefined;

  constructor(theme: UiTheme, props: ToolCardProps) {
    this.theme = theme;
    this.props = props;
  }

  setProps(props: Partial<ToolCardProps>): void {
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
    if (this.cache && this.cache.width === width && this.cache.revision === this.revision) return this.cache.lines;
    const lines = this.build(width);
    this.cache = { width, revision: this.revision, lines };
    return lines;
  }

  private build(width: number): readonly string[] {
    const status = STATUS[this.props.status];
    const meta = (this.props.meta ?? []).map(sanitizeLine).filter((item) => item.length > 0);
    const titleRight = [this.theme.fg(status.tone, status.glyph), ...meta].join(" · ");
    const sections = (this.props.sections ?? []).filter((section) => section.rows.length > 0);
    const children: Renderable[] = [{
      render: (inner: number) => this.renderSections(sections, inner),
    }];
    return new Panel(this.theme, {
      title: sanitizeLine(this.props.title),
      titleRight,
      tone: status.tone,
      border: "rounded",
      paddingX: 1,
      children,
    }).render(width);
  }

  private renderSections(sections: readonly ToolCardSection[], width: number): string[] {
    const lines: string[] = [];
    for (const [index, section] of sections.entries()) {
      if (index > 0) lines.push("");
      if (section.title !== undefined) lines.push(this.theme.fg("accent", truncate(sanitizeLine(section.title), width)));
      for (const row of section.rows) lines.push(truncate(sanitizeLine(row), width));
    }
    return lines;
  }
}
