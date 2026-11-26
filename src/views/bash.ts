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
}

export interface BashViewModel {
  status: ToolStatus;
  command?: string;
  output: string;
  durationMs?: number;
  cwd?: string;
  truncation?: BashTruncation;
  fullOutputPath?: string;
}

export interface BashViewProps {
  model: BashViewModel;
  expanded: boolean;
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

  render(width: number): readonly string[] {
    const { model, expanded } = this.props;
    const status = STATUS[model.status];
    const meta: string[] = [];
    if (model.durationMs !== undefined) meta.push(formatDuration(model.durationMs));
    if (model.cwd !== undefined) meta.push(model.cwd);
    const children: Renderable[] = [];

    if (model.command !== undefined && model.command.length > 0) {
      children.push(section(this.theme, "Command", new CodeBlock(this.theme, {
        lines: [{ text: `$ ${model.command}`, number: null }],
        showLineNumbers: false,
        preview: { direction: "head", maxVisualRows: 6, expanded },
      })));
    }

    const notices: string[] = [];
    if (model.truncation !== undefined) {
      notices.push(`… output truncated: ${model.truncation.outputLines} of ${model.truncation.totalLines} lines`);
    }
    if (model.fullOutputPath !== undefined) notices.push(`Full output: ${model.fullOutputPath}`);

    if (model.output.length > 0 || notices.length > 0) {
      const blocks: Renderable[] = [];
      if (model.output.length > 0) {
        blocks.push(new OutputBlock(this.theme, {
          rows: model.output.split("\n"),
          ansi: true,
          preview: { direction: "tail", maxVisualRows: 12, expanded },
        }));
      }
      children.push({
        render: (inner: number) => [
          this.theme.fg("accent", "Output"),
          ...blocks.flatMap((block) => block.render(inner)),
          ...notices.map((notice) => this.theme.fg("muted", notice)),
        ],
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
