import { displayWidth, normalizeWidth, pad, sanitizeLine, truncate } from "../core/ansi.js";
import {
  BORDERS,
  joinSides,
  renderChildLines,
  type BorderStyle,
  type Renderable,
} from "../core/layout.js";
import type { Tone, UiTheme } from "../core/theme.js";

export type { Renderable } from "../core/layout.js";

export interface PanelProps {
  title?: string;
  titleRight?: string;
  tone?: Tone;
  border?: BorderStyle;
  paddingX?: number;
  paddingY?: number;
  children: readonly Renderable[];
}

const EMPTY_LINES: readonly string[] = [];

export class Panel implements Renderable {
  private props: PanelProps;
  private theme: UiTheme;
  private revision = 0;
  private cache: { width: number; revision: number; lines: readonly string[] } | undefined;

  constructor(theme: UiTheme, props: PanelProps) {
    this.theme = theme;
    this.props = props;
  }

  setProps(props: Partial<PanelProps>): void {
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
    const requestedBorder = this.props.border ?? "rounded";
    const requestedPaddingX = nonNegative(this.props.paddingX ?? 1);
    const paddingY = nonNegative(this.props.paddingY ?? 0);

    if (requestedBorder === "none" || width < 2) {
      return this.buildBorderless(width, requestedBorder === "none" ? requestedPaddingX : 0, paddingY);
    }

    const chars = BORDERS[requestedBorder];
    const available = width - 2;
    const paddingX = Math.min(requestedPaddingX, Math.floor(available / 2));
    const inner = available - paddingX * 2;
    const vertical = this.theme.fg("border", chars.vertical);
    const lines: string[] = [this.buildTop(width, chars.horizontal, chars.topLeft, chars.topRight)];

    const blankInside = " ".repeat(available);
    for (let i = 0; i < paddingY; i++) lines.push(vertical + blankInside + vertical);

    if (inner > 0) {
      const content = renderChildLines(this.props.children, inner);
      for (const line of content) {
        lines.push(vertical + " ".repeat(paddingX) + pad(line, inner) + " ".repeat(paddingX) + vertical);
      }
    }

    for (let i = 0; i < paddingY; i++) lines.push(vertical + blankInside + vertical);
    lines.push(
      this.theme.fg("border", chars.bottomLeft) +
        this.theme.fg("border", chars.horizontal.repeat(available)) +
        this.theme.fg("border", chars.bottomRight),
    );
    return lines;
  }

  private buildBorderless(width: number, requestedPaddingX: number, paddingY: number): readonly string[] {
    const paddingX = Math.min(requestedPaddingX, Math.floor(width / 2));
    const inner = Math.max(0, width - paddingX * 2);
    const lines: string[] = [];
    const title = sanitizeLine(this.props.title ?? "");
    const right = sanitizeLine(this.props.titleRight ?? "");

    if (title.length > 0 || right.length > 0) {
      const left = title.length > 0 ? this.theme.fg(this.props.tone ?? "accent", title) : "";
      lines.push(joinSides(left, right.length > 0 ? this.theme.fg("muted", right) : "", width));
    }

    for (let i = 0; i < paddingY; i++) lines.push("");

    if (inner > 0) {
      for (const line of renderChildLines(this.props.children, inner)) {
        lines.push(" ".repeat(paddingX) + truncate(line, inner));
      }
    }
    return lines;
  }

  private buildTop(width: number, horizontal: string, topLeft: string, topRight: string): string {
    const innerWidth = width - 2;
    const title = sanitizeLine(this.props.title ?? "");
    const right = sanitizeLine(this.props.titleRight ?? "");
    const leftColored =
      title.length > 0
        ? this.theme.fg("border", `${horizontal} `) +
          this.theme.fg(this.props.tone ?? "accent", title) +
          this.theme.fg("border", " ")
        : this.theme.fg("border", horizontal);
    const rightColored =
      right.length > 0
        ? this.theme.fg("border", " ") + this.theme.fg("muted", right) + this.theme.fg("border", " ")
        : this.theme.fg("border", horizontal);

    const wantedRight = displayWidth(rightColored);
    const rightBudget = Math.min(wantedRight, innerWidth);
    const leftBudget = Math.max(0, innerWidth - rightBudget - (rightBudget > 0 ? 1 : 0));
    const renderedLeft = truncate(leftColored, leftBudget);
    const renderedRight = truncate(rightColored, rightBudget);
    const fill = Math.max(0, innerWidth - displayWidth(renderedLeft) - displayWidth(renderedRight));

    return (
      this.theme.fg("border", topLeft) +
      renderedLeft +
      this.theme.fg("border", horizontal.repeat(fill)) +
      renderedRight +
      this.theme.fg("border", topRight)
    );
  }
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}
