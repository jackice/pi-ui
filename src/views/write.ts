import { middleTruncate, sanitizeLine, truncate } from "../core/ansi.js";
import { UI_MAX_LINES, takeLines } from "../core/limits.js";
import { CodeBlock, type Highlight } from "../components/code-block.js";
import { Panel } from "../components/panel.js";
import type { Renderable } from "../core/layout.js";
import type { Tone, UiTheme } from "../core/theme.js";
import type { ToolStatus } from "../components/tool-card.js";

export interface WriteViewModel {
  status: ToolStatus;
  path?: string;
  content?: string;
  argsComplete: boolean;
  lineCount?: number;
  language?: string;
  notices?: readonly string[];
}

export interface WriteViewConfig {
  previewLines?: number;
  streamingPreviewLines?: number;
  maxPreviewRows?: number;
  lineNumbers?: boolean;
  showPath?: boolean;
  highlighter?: Highlight;
}

export interface WriteViewProps {
  model: WriteViewModel;
  expanded: boolean;
  config?: WriteViewConfig;
}

const STATUS: Readonly<Record<ToolStatus, { glyph: string; tone: Tone }>> = {
  pending: { glyph: "○", tone: "muted" },
  streaming: { glyph: "●", tone: "accent" },
  running: { glyph: "●", tone: "accent" },
  success: { glyph: "✓", tone: "success" },
  error: { glyph: "✗", tone: "error" },
  unknown: { glyph: "?", tone: "muted" },
};

export class WriteView {
  private props: WriteViewProps;
  private theme: UiTheme;
  private cachedHighlight: { language: string | undefined; source: string; rows: readonly string[] } | undefined;

  constructor(theme: UiTheme, props: WriteViewProps) {
    this.theme = theme;
    this.props = props;
  }

  setProps(props: WriteViewProps): void {
    this.props = props;
    this.cachedHighlight = undefined;
  }

  setTheme(theme: UiTheme): void {
    this.theme = theme;
    this.cachedHighlight = undefined;
  }

  invalidate(): void {}

  render(width: number): readonly string[] {
    const { model, expanded, config = {} } = this.props;
    const status = STATUS[model.status];
    const meta: string[] = [];
    if (model.lineCount !== undefined) meta.push(`${model.lineCount} lines`);
    const children: Renderable[] = [];
    const injected = config.highlighter;
    const highlighter: Highlight | undefined = injected === undefined ? undefined : (code, language) => {
      const cached = this.cachedHighlight;
      if (cached !== undefined && cached.language === language && cached.source === code) return cached.rows;
      const rows = injected(code, language);
      this.cachedHighlight = { language, source: code, rows };
      return rows;
    };

    if (config.showPath !== false && model.path !== undefined) {
      children.push({
        render: (inner: number) => [this.theme.fg("muted", middleTruncate(sanitizeLine(model.path ?? ""), inner))],
      });
    }

    const notices = (model.notices ?? []).flatMap((notice) => sanitizeLine(notice).split("\n"));
    if (notices.length > 0) {
      children.push({
        render: (inner: number) => notices.map((notice) => truncateNotice(this.theme, notice, inner)),
      });
    }

    const showContent = (model.status !== "error" || expanded) && (model.content?.length ?? 0) > 0;
    if (showContent) {
      const streaming = !model.argsComplete && model.status !== "success";
      const previewLines = streaming ? config.streamingPreviewLines ?? 12 : config.previewLines ?? 6;
      const limited = takeLines(model.content ?? "", UI_MAX_LINES);
      const contentLines = limited.lines;
      if (contentLines.length > 1 && contentLines.at(-1) === "" && limited.truncated === false) contentLines.pop();
      children.push(new CodeBlock(this.theme, {
        lines: contentLines.map((text, index) => ({ text, number: index + 1 })),
        ...(model.language === undefined ? {} : { language: model.language }),
        ...(highlighter === undefined ? {} : { highlight: highlighter }),
        showLineNumbers: config.lineNumbers !== false,
        preview: {
          direction: streaming ? "tail" : "head",
          maxLogicalLines: previewLines,
          maxVisualRows: config.maxPreviewRows ?? 18,
          expanded,
          ...(limited.truncated ? { hideCount: true } : {}),
        },
      }));
      if (limited.truncated) {
        children.push({
          render: (inner: number) => [truncateNotice(this.theme, "UI safety limit — available result not fully shown", inner)],
        });
      }
    }

    return new Panel(this.theme, {
      title: "Write",
      titleRight: [this.theme.fg(status.tone, status.glyph), ...meta].join(" · "),
      tone: status.tone,
      border: "rounded",
      paddingX: 1,
      children,
    }).render(width);
  }
}

function truncateNotice(theme: UiTheme, notice: string, width: number): string {
  return theme.fg("muted", truncate(sanitizeLine(notice), Math.max(1, width)));
}
