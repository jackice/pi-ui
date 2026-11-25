import { displayWidth, normalizeWidth, sanitizeLine, truncate } from "../core/ansi.js";
import type { Tone, UiTheme } from "../core/theme.js";
import { renderSeparator, separatorText, type SeparatorStyle } from "./separator.js";

export interface SegmentVariant {
  text: string;
  tone?: Tone;
}

export interface SegmentSpec {
  id: string;
  side: "left" | "right";
  /** 数值越大，在压缩布局中保留得越久。 */
  priority: number;
  full: SegmentVariant;
  compact?: SegmentVariant;
  min?: SegmentVariant;
}

export interface GaugeSlot {
  /** gauge 的最小宽度；空间不足时先牺牲其他分段。 */
  minWidth?: number;
  render(width: number): string;
}

export interface SegmentBarOptions {
  width: number;
  left?: readonly SegmentSpec[];
  right?: readonly SegmentSpec[];
  gauge?: GaugeSlot;
  separator?: SeparatorStyle;
  theme: UiTheme;
}

export interface SegmentBarWidths {
  left: number;
  gauge: number;
  right: number;
}

export interface SegmentBarResult {
  line: string;
  left: string;
  gauge: string;
  right: string;
  hiddenIds: readonly string[];
  widths: SegmentBarWidths;
}

interface Entry {
  spec: SegmentSpec;
  order: number;
  variants: readonly SegmentVariant[];
  level: number;
}

function variantsOf(spec: SegmentSpec): readonly SegmentVariant[] {
  const variants: SegmentVariant[] = [spec.full];
  if (spec.compact) variants.push(spec.compact);
  if (spec.min) variants.push(spec.min);
  return variants;
}

function joinSpecs(
  entries: readonly Entry[],
  theme: UiTheme,
  separator: SeparatorStyle,
): { text: string; width: number } {
  const visible = entries.filter((entry) => entry.level < entry.variants.length);
  const sep = renderSeparator(separator, theme);
  const sepWidth = displayWidth(separatorText(separator));
  let text = "";
  let width = 0;
  visible.forEach((entry, index) => {
    const variant = entry.variants[entry.level];
    if (!variant) return;
    const value = sanitizeLine(variant.text).replace(/[\r\n\t]+/g, " ").trim();
    if (index > 0) {
      text += sep;
      width += sepWidth;
    }
    text += theme.fg(variant.tone ?? "text", value);
    width += displayWidth(value);
  });
  return { text, width };
}

function degradeCandidate(entries: readonly Entry[], compactOnly: boolean): Entry | undefined {
  let chosen: Entry | undefined;
  for (const entry of entries) {
    if (entry.level >= entry.variants.length) continue;
    if (compactOnly && entry.level !== 0) continue;
    if (compactOnly && entry.variants.length < 2) continue;
    if (!chosen) {
      chosen = entry;
      continue;
    }
    const priority = entry.spec.priority - chosen.spec.priority;
    if (priority < 0) {
      chosen = entry;
    } else if (priority === 0) {
      const side = (entry.spec.side === "right" ? 0 : 1) - (chosen.spec.side === "right" ? 0 : 1);
      if (side < 0 || (side === 0 && entry.order > chosen.order)) chosen = entry;
    }
  }
  return chosen;
}

export function layoutSegmentBar(options: SegmentBarOptions): SegmentBarResult {
  const limit = normalizeWidth(options.width);
  const theme = options.theme;
  const separator = options.separator ?? "none";
  const leftSpecs = options.left ?? [];
  const rightSpecs = options.right ?? [];
  if (limit === 0) {
    return {
      line: "",
      left: "",
      gauge: "",
      right: "",
      hiddenIds: leftSpecs.concat(rightSpecs).map((spec) => spec.id),
      widths: { left: 0, gauge: 0, right: 0 },
    };
  }

  const entries: Entry[] = [];
  for (const spec of leftSpecs) {
    entries.push({ spec, order: entries.length, variants: variantsOf(spec), level: 0 });
  }
  for (const spec of rightSpecs) {
    entries.push({ spec, order: entries.length, variants: variantsOf(spec), level: 0 });
  }
  const leftEntries = entries.filter((entry) => entry.spec.side === "left");
  const rightEntries = entries.filter((entry) => entry.spec.side === "right");
  const gaugeMin = Math.max(0, Math.floor(options.gauge?.minWidth ?? 0));

  let gaugeEnabled = options.gauge !== undefined;
  let compactOnly = true;
  const maxSteps = entries.reduce((sum, entry) => sum + entry.variants.length, 0) + 2;

  for (let step = 0; step < maxSteps; step++) {
    const left = joinSpecs(leftEntries, theme, separator);
    const right = joinSpecs(rightEntries, theme, separator);
    const gaps = gaugeEnabled ? (left.width > 0 ? 1 : 0) + (right.width > 0 ? 1 : 0) : left.width > 0 && right.width > 0 ? 1 : 0;
    const available = limit - left.width - right.width - gaps;

    if (gaugeEnabled && available >= gaugeMin) {
      const gaugeText = options.gauge ? options.gauge.render(available) : "";
      const line = `${left.text}${left.width > 0 ? " " : ""}${gaugeText}${right.width > 0 ? " " : ""}${right.text}`;
      return {
        line: truncate(line, limit),
        left: left.text,
        gauge: gaugeText,
        right: right.text,
        hiddenIds: entries.filter((entry) => entry.level >= entry.variants.length).map((entry) => entry.spec.id),
        widths: { left: left.width, gauge: displayWidth(gaugeText), right: right.width },
      };
    }

    if (!gaugeEnabled && available >= 0) {
      const line = right.width > 0 ? `${left.text} ${right.text}` : left.text;
      return {
        line: truncate(line, limit),
        left: left.text,
        gauge: "",
        right: right.text,
        hiddenIds: entries.filter((entry) => entry.level >= entry.variants.length).map((entry) => entry.spec.id),
        widths: { left: left.width, gauge: 0, right: right.width },
      };
    }

    const candidate = degradeCandidate(entries, compactOnly);
    if (candidate) {
      candidate.level++;
      continue;
    }
    if (compactOnly) {
      compactOnly = false;
      continue;
    }
    if (gaugeEnabled) {
      gaugeEnabled = false;
      continue;
    }
    const line = right.width > 0 ? `${left.text} ${right.text}` : left.text;
    return {
      line: truncate(line, limit),
      left: left.text,
      gauge: "",
      right: right.text,
      hiddenIds: entries.filter((entry) => entry.level >= entry.variants.length).map((entry) => entry.spec.id),
      widths: { left: left.width, gauge: 0, right: right.width },
    };
  }

  const left = joinSpecs(leftEntries, theme, separator);
  const right = joinSpecs(rightEntries, theme, separator);
  return {
    line: truncate(left.text + right.text, limit),
    left: left.text,
    gauge: "",
    right: right.text,
    hiddenIds: entries.filter((entry) => entry.level >= entry.variants.length).map((entry) => entry.spec.id),
    widths: { left: left.width, gauge: 0, right: right.width },
  };
}

export class SegmentBar {
  private theme: UiTheme;
  private options: SegmentBarOptions;
  private revision = 0;
  private cache: { revision: number; result: SegmentBarResult } | undefined;

  constructor(theme: UiTheme, options: SegmentBarOptions) {
    this.theme = theme;
    this.options = options;
  }

  setOptions(options: Partial<SegmentBarOptions>): void {
    this.options = { ...this.options, ...options };
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

  render(): SegmentBarResult {
    if (this.cache && this.cache.revision === this.revision) return this.cache.result;
    const result = layoutSegmentBar({ ...this.options, theme: this.theme });
    this.cache = { revision: this.revision, result };
    return result;
  }
}
