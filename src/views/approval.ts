import { Key, matchesKey } from "@earendil-works/pi-tui";

import { sanitizeText, truncate, wrap } from "../core/ansi.js";
import type { Renderable } from "../core/layout.js";
import type { Tone, UiTheme } from "../core/theme.js";
import { Panel } from "../components/panel.js";

export type ApprovalRisk = "medium" | "high" | "critical";
export type ApprovalChoice = "allow_once" | "deny";

export interface ApprovalRequestView {
  toolName: string;
  command: string;
  cwd: string;
  reason: string;
  risk: ApprovalRisk;
}

export interface ApprovalViewProps {
  request: ApprovalRequestView;
  /** 默认 Deny。 */
  selected?: ApprovalChoice;
  maxCommandLines?: number;
  armRemainingMs?: number;
}

export interface ApprovalKeybindings {
  matches(data: string, keybinding: string): boolean;
}

const DEFAULT_COMMAND_LINES = 8;

export class ApprovalView implements Renderable {
  private props: ApprovalViewProps;
  private theme: UiTheme;
  private selected: ApprovalChoice;
  private scroll = 0;
  private panel: Panel;

  constructor(theme: UiTheme, props: ApprovalViewProps) {
    this.theme = theme;
    this.props = props;
    this.selected = props.selected ?? "deny";
    this.panel = this.buildPanel();
  }

  setProps(props: Partial<ApprovalViewProps>): void {
    this.props = { ...this.props, ...props };
    if (props.selected !== undefined) this.selected = props.selected;
    this.scroll = 0;
    this.panel = this.buildPanel();
  }

  setTheme(theme: UiTheme): void {
    this.theme = theme;
    this.panel = this.buildPanel();
  }

  invalidate(): void {
    this.panel.invalidate();
  }

  render(width: number): readonly string[] {
    return this.panel.render(width);
  }

  /** 返回最终决策；方向键/确认/取消由 Gate 处理 arm 与超时。 */
  handleInput(data: string, keybindings: ApprovalKeybindings): ApprovalChoice | undefined {
    if (keybindings.matches(data, "tui.select.up") || keybindings.matches(data, "tui.select.down")) {
      this.selected = this.selected === "deny" ? "allow_once" : "deny";
      this.invalidate();
      return undefined;
    }
    if (keybindings.matches(data, "tui.select.confirm")) return this.selected;
    if (keybindings.matches(data, "tui.select.cancel")) return "deny";
    if (matchesKey(data, Key.pageUp)) {
      this.scroll = Math.max(0, this.scroll - this.visibleCommandLines());
      this.invalidate();
      return undefined;
    }
    if (matchesKey(data, Key.pageDown)) {
      this.scroll += this.visibleCommandLines();
      this.invalidate();
      return undefined;
    }
    return undefined;
  }

  private buildPanel(): Panel {
    return new Panel(this.theme, {
      title: `Approval · ${this.props.request.toolName}`,
      titleRight: this.props.request.risk,
      tone: riskTone(this.props.request.risk),
      border: "rounded",
      paddingX: 1,
      children: [{ render: (width: number) => this.body(width) }],
    });
  }

  private body(width: number): string[] {
    const theme = this.theme;
    const request = this.props.request;
    const lines: string[] = [];
    lines.push(theme.fg("muted", "cwd  ") + truncate(sanitizeText(request.cwd), Math.max(0, width - 5)));
    for (const line of wrap(theme.fg("warning", sanitizeText(request.reason)), width)) lines.push(line);
    lines.push("");

    const commandLines: string[] = [];
    for (const raw of sanitizeText(request.command).split("\n")) {
      const wrapped = wrap(raw, width);
      if (wrapped.length === 0) commandLines.push("");
      else commandLines.push(...wrapped);
    }
    const visible = this.visibleCommandLines();
    const maxScroll = Math.max(0, commandLines.length - visible);
    this.scroll = Math.min(this.scroll, maxScroll);
    if (this.scroll > 0) lines.push(theme.fg("muted", `↑ ${this.scroll} 行`));
    for (const line of commandLines.slice(this.scroll, this.scroll + visible)) {
      lines.push(theme.fg("text", line));
    }
    const hidden = commandLines.length - visible - this.scroll;
    if (hidden > 0) lines.push(theme.fg("muted", `↓ ${hidden} 行（PgDn 查看）`));
    lines.push("");

    const options: Array<[ApprovalChoice, string, Tone]> = [
      ["allow_once", "Allow once", "success"],
      ["deny", "Deny", "error"],
    ];
    for (const [value, label, tone] of options) {
      const selected = value === this.selected;
      lines.push(
        `${selected ? theme.fg("accent", ">") : " "} ${theme.fg(selected ? tone : "text", label)}`,
      );
    }
    if (this.props.armRemainingMs !== undefined && this.props.armRemainingMs > 0) {
      lines.push(theme.fg("warning", `确认保护 ${this.props.armRemainingMs}ms`));
    }
    lines.push(theme.fg("muted", "↑/↓ 选择 · Enter 确认 · Esc 拒绝 · PgUp/PgDn 滚动"));
    return lines;
  }

  private visibleCommandLines(): number {
    return Math.max(1, Math.floor(this.props.maxCommandLines ?? DEFAULT_COMMAND_LINES));
  }
}

function riskTone(risk: ApprovalRisk): Tone {
  return risk === "medium" ? "warning" : "error";
}
