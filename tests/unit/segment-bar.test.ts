import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.js";
import { plainTheme } from "../../src/core/theme.js";
import {
  SegmentBar,
  layoutSegmentBar,
  type SegmentSpec,
} from "../../src/components/segment-bar.js";

function spec(
  id: string,
  side: "left" | "right",
  priority: number,
  full: string,
  compact?: string,
  min?: string,
): SegmentSpec {
  return {
    id,
    side,
    priority,
    full: { text: full },
    ...(compact !== undefined ? { compact: { text: compact } } : {}),
    ...(min !== undefined ? { min: { text: min } } : {}),
  };
}

const gauge = (width: number) => `${"─".repeat(Math.max(0, width))}`;

describe("SegmentBar", () => {
  it("完整布局保留左右分段与弹性 gauge", () => {
    const result = layoutSegmentBar({
      width: 60,
      left: [spec("brand", "left", 20, "φ"), spec("model", "left", 100, "GPT high")],
      right: [spec("rate", "right", 50, "41t/s")],
      gauge: { minWidth: 10, render: gauge },
      separator: "ascii",
      theme: plainTheme(),
    });
    expect(result.line).toContain("φ > GPT high");
    expect(result.line).toContain("41t/s");
    expect(result.hiddenIds).toEqual([]);
    expect(displayWidth(result.line)).toBe(60);
  });

  it("宽度不足时优先隐藏低优先级分段", () => {
    const result = layoutSegmentBar({
      width: 20,
      left: [spec("brand", "left", 20, "φ"), spec("model", "left", 100, "GPT-6.2 high")],
      right: [spec("time", "right", 10, "12:00:00")],
      separator: "pipe",
      theme: plainTheme(),
    });
    expect(result.line).toContain("GPT-6.2 high");
    expect(result.line).not.toContain("12:00:00");
    expect(result.hiddenIds).toContain("time");
    expect(displayWidth(result.line)).toBeLessThanOrEqual(30);
  });

  it("按 full→compact→min→hidden 降级且保留高优先级", () => {
    const result = layoutSegmentBar({
      width: 28,
      left: [
        spec("brand", "left", 20, "φ"),
        spec("path", "left", 80, "~/dev/src/github.com/jackice/pi-ui", "pi-ui", "pi"),
      ],
      separator: "ascii",
      theme: plainTheme(),
    });
    expect(result.hiddenIds.includes("brand")).toBe(false);
    expect(result.line).toContain("φ");
    expect(displayWidth(result.line)).toBeLessThanOrEqual(28);
  });

  it("gauge 优先缩减到 minWidth 再牺牲分段", () => {
    const widths: number[] = [];
    const result = layoutSegmentBar({
      width: 40,
      left: [spec("brand", "left", 20, "φ")],
      right: [spec("model", "right", 100, "GPT high")],
      gauge: {
        minWidth: 6,
        render: (width) => {
          widths.push(width);
          return gauge(width);
        },
      },
      separator: "none",
      theme: plainTheme(),
    });
    expect(widths.at(-1)).toBe(40 - displayWidth("φ") - displayWidth("GPT high") - 2);
    expect(result.hiddenIds).toEqual([]);
    expect(displayWidth(result.line)).toBe(40);
  });

  it("width<=0 返回空结果", () => {
    const result = layoutSegmentBar({ width: 0, left: [], right: [], theme: plainTheme() });
    expect(result.line).toBe("");
    expect(result.widths).toEqual({ left: 0, gauge: 0, right: 0 });
  });

  it("空分隔符不产生孤立分隔", () => {
    const result = layoutSegmentBar({
      width: 20,
      left: [spec("brand", "left", 20, "φ")],
      right: [],
      separator: "none",
      theme: plainTheme(),
    });
    expect(result.line).toBe("φ");
  });

  it("净化外部文本中的控制序列", () => {
    const result = layoutSegmentBar({
      width: 30,
      left: [spec("path", "left", 80, "a\u001b[31mb\nc")],
      separator: "none",
      theme: plainTheme(),
    });
    expect(result.line).not.toContain("\u001b");
    expect(result.line).not.toContain("\n");
  });

  it("确定性：相同输入相同输出", () => {
    const options = {
      width: 50,
      left: [spec("a", "left" as const, 30, "alpha")],
      right: [spec("b", "right" as const, 30, "beta")],
      separator: "dot" as const,
      theme: plainTheme(),
    };
    const first = layoutSegmentBar(options);
    const second = layoutSegmentBar(options);
    expect(second).toEqual(first);
  });

  it("SegmentBar 类缓存并支持失效", () => {
    const bar = new SegmentBar(plainTheme(), {
      width: 40,
      left: [spec("brand", "left", 20, "φ")],
      right: [],
      separator: "ascii",
      theme: plainTheme(),
    });
    const first = bar.render();
    expect(bar.render()).toBe(first);
    bar.invalidate();
    expect(bar.render()).not.toBe(first);
  });
});
