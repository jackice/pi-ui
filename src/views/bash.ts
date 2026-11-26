import { middleTruncate, sanitizeLine } from "../core/ansi.js";
import { CodeBlock } from "../components/code-block.js";
import { OutputBlock } from "../components/output-block.js";
import { Panel } from "../components/panel.js";
import type { Renderable } from "../core/layout.js";
import type { Tone, UiTheme } from "../core/theme.js";
import type { ToolStatus } from "../components/tool-card.js";

export interface BashTruncation {
  totalLines: number;
  outputLines: number;
  totalBytes?: number;
  outputBytes?: number;
  lastLinePartial?: boolean;
  truncatedBy?: "lines" | "bytes";
  maxBytes?: number;
}

export interface BashViewModel {
  status: ToolStatus;
  command?: string;
  output: string;
  durationMs?: number;
  cwd?: string;
  cwdKind?: "execution" | "session";
  truncation?: BashTruncation;
  fullOutputPath?: string;
}

export interface BashViewConfig {
  commandRows?: number;
  outputRows?: number;
  ansi?: boolean;
  showTruncation?: boolean;
  showFullOutputPath?: boolean;
  showDuration?: boolean;
  showCwd?: boolean;
}

export interface BashViewProps {
  model: BashViewModel;
  expanded: boolean;
  config?: BashViewConfig;
  showCommand?: boolean;
}

const STATUS: Readonly<Record<ToolStatus, { glyph: string; tone: Tone }>> = {
  pending: { glyph: "○", tone: "muted" },
  streaming: { glyph: "●", tone: "accent" },
  running: { glyph: "●", tone: "accent" },
  success: { glyph: "✓", tone: "success" },
  error: { glyph: "✗", tone: "error" },
  unknown: { glyph: "?", tone: "muted" },
};

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function section(theme: UiTheme, title: string, block: Renderable): Renderable {
  return {
    render: (width: number) => [theme.fg("accent", title), ...block.render(width)],
  };
}

export class BashView {
  private props: BashViewProps;
  private theme: UiTheme;

  constructor(theme: UiTheme, props: BashViewProps) {
    this.theme = theme;
    this.props = props;
  }

  setProps(props: BashViewProps): void {
    this.props = props;
  }

  setTheme(theme: UiTheme): void {
    this.theme = theme;
  }

  invalidate(): void {
    // 无内部缓存；宿主重绘时直接重新组合子组件。
  }

  render(width: number): readonly string[] {
    const { model, expanded, config = {}, showCommand = true } = this.props;
    const status = STATUS[model.status];
    const meta: string[] = [];
    if (config.showDuration !== false && model.durationMs !== undefined) meta.push(formatDuration(model.durationMs));
    const children: Renderable[] = [];

    if (config.showCwd === true && model.cwd !== undefined) {
      const label = model.cwdKind === "session" ? "session cwd" : "cwd";
      children.push({
        render: (inner: number) => [this.theme.fg("muted", `${label}  ${middleTruncate(sanitizeLine(model.cwd ?? ""), Math.max(1, inner - label.length - 2))}`)],
      });
    }

    if (showCommand && model.command !== undefined && model.command.length > 0) {
      children.push(section(this.theme, "Command", new CodeBlock(this.theme, {
        lines: [{ text: `$ ${model.command}`, number: null }],
        showLineNumbers: false,
        preview: { direction: "head", maxVisualRows: config.commandRows ?? 6, expanded },
      })));
    }

    const notices: string[] = [];
    if (config.showTruncation !== false && model.truncation !== undefined) {
      const { totalLines, outputLines, lastLinePartial, maxBytes } = model.truncation;
      if (outputLines < totalLines) {
        notices.push(`… output truncated: ${outputLines} of ${totalLines} lines`);
      } else if (lastLinePartial === true) {
        notices.push(maxBytes === undefined ? "… output truncated at byte limit" : `… output truncated at ${maxBytes} bytes`);
      }
    }
    if (model.output.length > 0 || notices.length > 0 || (config.showFullOutputPath !== false && model.fullOutputPath !== undefined)) {
      const blocks: Renderable[] = [];
      if (model.output.length > 0) {
        blocks.push(new OutputBlock(this.theme, {
          rows: [model.output],
          ansi: config.ansi !== false,
          preview: { direction: "tail", maxVisualRows: config.outputRows ?? 12, expanded },
        }));
      }
      children.push({
        render: (inner: number) => {
          const lines = [
            this.theme.fg("accent", "Output"),
            ...blocks.flatMap((block) => block.render(inner)),
            ...notices.map((notice) => this.theme.fg("muted", notice)),
          ];
          if (config.showFullOutputPath !== false && model.fullOutputPath !== undefined) {
            const prefix = inner >= 20 ? "Full output: " : "Out: ";
            lines.push(this.theme.fg("muted", `${prefix}${middleTruncate(sanitizeLine(model.fullOutputPath), Math.max(4, inner - prefix.length))}`));
          }
          return lines;
        },
      });
    }

    return new Panel(this.theme, {
      title: "Bash",
      titleRight: [this.theme.fg(status.tone, status.glyph), ...meta].join(" · "),
      tone: status.tone,
      border: "rounded",
      paddingX: 1,
      children,
    }).render(width);
  }
}
