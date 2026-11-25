import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.js";
import { plainTheme } from "../../src/core/theme.js";
import { InlineGauge } from "../../src/components/inline-gauge.js";

describe("InlineGauge", () => {
  it("未知百分比显示 ? 且不绘制比例", () => {
    const gauge = new InlineGauge(plainTheme(), { tone: "accent" });
    const line = gauge.render(20);
    expect(line.startsWith("?")).toBe(true);
    expect(line).not.toContain("━");
    expect(displayWidth(line)).toBe(20);
  });

  it("已知百分比绘制填充且宽度精确", () => {
    const gauge = new InlineGauge(plainTheme(), { percent: 50, tone: "accent" });
    const line = gauge.render(20);
    expect(line).toContain("50%");
    expect(displayWidth(line)).toBe(20);
  });

  it("超过 100% 保留标签并 clamp 填充", () => {
    const gauge = new InlineGauge(plainTheme(), { percent: 110, label: "110%!", tone: "error" });
    const line = gauge.render(20);
    expect(line).toContain("110%!");
    const filled = [...line].filter((char) => char === "━").length;
    const empty = [...line].filter((char) => char === "─").length;
    expect(filled).toBeGreaterThan(0);
    expect(empty).toBe(0);
    expect(displayWidth(line)).toBe(20);
  });

  it("标签冲突时优先保留 label 而不是 endLabel", () => {
    const gauge = new InlineGauge(plainTheme(), {
      percent: 42,
      label: "42%",
      endLabel: "200K",
      tone: "accent",
    });
    const narrow = gauge.render(8);
    expect(narrow).toContain("42%");
    expect(displayWidth(narrow)).toBeLessThanOrEqual(8);
  });

  it("ASCII 使用可读字符", () => {
    const gauge = new InlineGauge(plainTheme(), { percent: 50, tone: "accent" }, { ascii: true });
    const line = gauge.render(20);
    expect(line).toContain("=");
    expect(line).toContain("-");
    expect(line).not.toContain("━");
  });

  it("标记来自配置且不重叠", () => {
    const gauge = new InlineGauge(plainTheme(), {
      percent: 80,
      label: "80%",
      endLabel: "500K",
      tone: "accent",
      markers: [
        { percent: 70, glyph: "|", tone: "warning" },
        { percent: 70.5, glyph: "*", tone: "error" },
      ],
    });
    const line = gauge.render(30);
    expect(line).toContain("|");
    expect(line).not.toContain("*");
    expect(displayWidth(line)).toBe(30);
  });

  it("非法标记值被忽略", () => {
    const gauge = new InlineGauge(plainTheme(), {
      percent: 50,
      tone: "accent",
      markers: [
        { percent: Number.NaN, glyph: "x", tone: "error" },
        { percent: -5, glyph: "y", tone: "error" },
        { percent: Number.POSITIVE_INFINITY, glyph: "z", tone: "error" },
      ],
    });
    const line = gauge.render(20);
    expect(line).not.toContain("x");
    expect(line).not.toContain("y");
    expect(line).not.toContain("z");
  });

  it("宽度 0/1/2 不抛错也不越界", () => {
    const gauge = new InlineGauge(plainTheme(), { percent: 50, label: "50%", endLabel: "500K", tone: "accent" });
    for (const width of [0, 1, 2]) {
      const line = gauge.render(width);
      expect(displayWidth(line)).toBeLessThanOrEqual(width);
    }
  });

  it("缓存命中不改变结果", () => {
    const gauge = new InlineGauge(plainTheme(), { percent: 50, tone: "accent" });
    const first = gauge.render(20);
    const second = gauge.render(20);
    expect(second).toBe(first);
    gauge.setProps({ percent: 60 });
    expect(gauge.render(20)).not.toBe(first);
  });
});
