import { middleTruncate, sanitizeLine, truncate } from "../core/ansi.js";
import { CodeBlock } from "../components/code-block.js";
import { OutputBlock } from "../components/output-block.js";
import { Panel } from "../components/panel.js";
import type { Renderable } from "../core/layout.js";
import type { Tone, UiTheme } from "../core/theme.js";
import type { ToolStatus } from "../components/tool-card.js";

export interface ReadLine {
  text: string;
  number: number | null;
}

export interface ReadTruncation {
  outputLines?: number;
  totalLines?: number;
  firstLineExceedsLimit?: boolean;
  by?: "lines" | "bytes";
  maxLines?: number;
  maxBytes?: number;
}

export type ReadContentKind = "code" | "text" | "markdown-source" | "image" | "mixed" | "unknown";

export interface ReadViewModel {
  status: ToolStatus;
  path?: string;
  requestedOffset?: number;
  requestedLimit?: number;
  source: "native" | "hashline" | "unknown";
  contentKind: ReadContentKind;
  lines: readonly ReadLine[];
  language?: string;
  truncation?: ReadTruncation;
  rawFallback?: string;
}

export interface ReadViewConfig {
  previewLines?: number;
  maxPreviewRows?: number;
  lineNumbers?: boolean;
  showPath?: boolean;
}

export interface ReadViewProps {
  model: ReadViewModel;
  expanded: boolean;
  config?: ReadViewConfig;
}

const STATUS: Readonly<Record<ToolStatus, { glyph: string; tone: Tone }>> = {
  pending: { glyph: "○", tone: "muted" },
  streaming: { glyph: "●", tone: "accent" },
  running: { glyph: "●", tone: "accent" },
  success: { glyph: "✓", tone: "success" },
  error: { glyph: "✗", tone: "error" },
  unknown: { glyph: "?", tone: "muted" },
};

function noticeFor(truncation: ReadTruncation): string | undefined {
  if (truncation.firstLineExceedsLimit === true) return "… first line exceeds the byte limit";
  if (truncation.by === undefined && truncation.outputLines === undefined) return undefined;
  if (truncation.outputLines !== undefined && truncation.totalLines !== undefined && truncation.outputLines < truncation.totalLines) {
    return `… output truncated: ${truncation.outputLines} of ${truncation.totalLines}`;
  }
  return "… output truncated";
}

export class ReadView {
  private props: ReadViewProps;
  private theme: UiTheme;

  constructor(theme: UiTheme, props: ReadViewProps) {
    this.theme = theme;
    this.props = props;
  }

  setProps(props: ReadViewProps): void {
    this.props = props;
  }

  setTheme(theme: UiTheme): void {
    this.theme = theme;
  }

  invalidate(): void {}

  render(width: number): readonly string[] {
    const { model, expanded, config = {} } = this.props;
    const status = STATUS[model.status];
    const children: Renderable[] = [];

    if (config.showPath !== false && model.path !== undefined) {
      children.push({
        render: (inner: number) => [this.theme.fg("muted", middleTruncate(sanitizeLine(model.path ?? ""), inner))],
      });
    }

    const notice = model.truncation === undefined ? undefined : noticeFor(model.truncation);
    if (notice !== undefined) {
      children.push({
        render: (inner: number) => [this.theme.fg("warning", middleTruncate(notice, inner))],
      });
    }

    const lastNumbered = model.lines.reduce((last, line, index) => line.number === null ? last : index, -1);
    const allUnnumbered = model.lines.length > 0 && lastNumbered === -1;
    const metadataIsTail = !allUnnumbered && model.lines.slice(lastNumbered + 1).every((line) => line.number === null);
    const contentLines = allUnnumbered ? model.lines : metadataIsTail ? model.lines.slice(0, lastNumbered + 1) : model.lines;
    const metadataLines = allUnnumbered ? [] : metadataIsTail ? model.lines.slice(lastNumbered + 1) : [];
    if (contentLines.length > 0) {
      children.push(new CodeBlock(this.theme, {
        lines: contentLines,
        ...(model.language === undefined ? {} : { language: model.language }),
        showLineNumbers: !allUnnumbered && config.lineNumbers !== false,
        preview: {
          direction: "head",
          maxLogicalLines: config.previewLines ?? 12,
          maxVisualRows: config.maxPreviewRows ?? 24,
          expanded,
        },
      }));
    } else if (model.rawFallback !== undefined && model.rawFallback.length > 0) {
      children.push(new OutputBlock(this.theme, {
        rows: [model.rawFallback],
        ansi: false,
        preview: { direction: "head", maxVisualRows: config.maxPreviewRows ?? 24, expanded },
      }));
    }

    if (metadataLines.length > 0) {
      children.push({
        render: (inner: number) => metadataLines.map((line) => line.text === "" ? "" : this.theme.fg("muted", truncate(sanitizeLine(line.text), inner))),
      });
    }

    const range = model.requestedOffset !== undefined || model.requestedLimit !== undefined
      ? [model.requestedOffset === undefined ? "" : `@${model.requestedOffset}`, model.requestedLimit === undefined ? "" : `+${model.requestedLimit}`].filter(Boolean).join(" ")
      : "";
    return new Panel(this.theme, {
      title: "Read",
      titleRight: [this.theme.fg(status.tone, status.glyph), range].filter(Boolean).join(" · "),
      tone: status.tone,
      border: "rounded",
      paddingX: 1,
      children,
    }).render(width);
  }
}
