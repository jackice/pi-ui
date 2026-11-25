import { displayWidth, normalizeWidth, sanitizeLine, truncate } from "../core/ansi.js";
import type { Tone, UiTheme } from "../core/theme.js";

export interface GaugeMarker {
  percent: number;
  glyph: string;
  tone: Tone;
}

export interface InlineGaugeProps {
  percent?: number;
  label?: string;
  endLabel?: string;
  markers?: readonly GaugeMarker[];
  tone: Tone;
}

export interface InlineGaugeOptions {
  ascii?: boolean;
}

function isKnownPercent(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

function markerGlyph(marker: GaugeMarker): string | undefined {
  const glyph = sanitizeLine(marker.glyph);
  return displayWidth(glyph) === 1 ? glyph : undefined;
}

export class InlineGauge {
  private props: InlineGaugeProps;
  private theme: UiTheme;
  private ascii: boolean;
  private revision = 0;
  private cache: { width: number; revision: number; line: string } | undefined;

  constructor(theme: UiTheme, props: InlineGaugeProps, options: InlineGaugeOptions = {}) {
    this.theme = theme;
    this.props = props;
    this.ascii = options.ascii ?? false;
  }

  setProps(props: Partial<InlineGaugeProps>): void {
    this.props = { ...this.props, ...props };
    this.invalidate();
  }

  setTheme(theme: UiTheme): void {
    this.theme = theme;
    this.invalidate();
  }

  setAscii(ascii: boolean): void {
    if (this.ascii === ascii) return;
    this.ascii = ascii;
    this.invalidate();
  }

  invalidate(): void {
    this.revision++;
    this.cache = undefined;
  }

  render(width: number): string {
    const limit = normalizeWidth(width);
    if (limit === 0) return "";
    if (this.cache && this.cache.width === limit && this.cache.revision === this.revision) {
      return this.cache.line;
    }
    const line = this.build(limit);
    this.cache = { width: limit, revision: this.revision, line };
    return line;
  }

  private build(width: number): string {
    const known = isKnownPercent(this.props.percent);
    const label = truncate(
      sanitizeLine(this.props.label ?? (known ? `${Math.round(this.props.percent as number)}%` : "?")),
      width,
    );
    const labelWidth = displayWidth(label);
    const endLabel = truncate(sanitizeLine(this.props.endLabel ?? ""), Math.max(0, width - labelWidth - 1));
    const endWidth = displayWidth(endLabel);
    const gap = 1;
    const trackWidth = width - labelWidth - endWidth - (endLabel ? gap * 2 : gap);

    if (trackWidth < 1) {
      const kept = endLabel && labelWidth + gap + endWidth <= width ? `${label} ${endLabel}` : label;
      return truncate(kept, width);
    }

    const track = this.renderTrack(trackWidth, known ? this.props.percent : undefined);
    const head = this.theme.fg(known ? this.props.tone : "muted", label);
    const tail = endLabel ? ` ${this.theme.fg("muted", endLabel)}` : "";
    return `${head} ${track}${tail}`;
  }

  private renderTrack(width: number, percent: number | undefined): string {
    const fillChar = this.ascii ? "=" : "━";
    const emptyChar = this.ascii ? "-" : "─";
    const known = percent !== undefined;
    const filled = known
      ? Math.min(width, Math.max(0, Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)))
      : 0;

    if (!known) {
      return this.theme.fg("muted", emptyChar.repeat(width));
    }

    const cells: string[] = new Array(width);
    for (let i = 0; i < width; i++) {
      cells[i] = i < filled ? this.theme.fg(this.props.tone, fillChar) : this.theme.fg("muted", emptyChar);
    }

    const occupied = new Set<number>();
    for (const marker of this.props.markers ?? []) {
      if (!Number.isFinite(marker.percent) || marker.percent < 0) continue;
      const glyph = markerGlyph(marker);
      if (!glyph) continue;
      const column = Math.min(width - 1, Math.max(0, Math.round((Math.min(100, Math.max(0, marker.percent)) / 100) * (width - 1))));
      if (occupied.has(column)) continue;
      occupied.add(column);
      cells[column] = this.theme.fg(marker.tone, glyph);
    }

    return cells.join("");
  }
}
