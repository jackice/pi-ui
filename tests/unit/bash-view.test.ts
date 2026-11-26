import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { BashView, type BashViewModel } from "../../src/views/bash.ts";

function model(patch: Partial<BashViewModel> = {}): BashViewModel {
  return {
    status: "success",
    command: "pnpm test",
    output: Array.from({ length: 20 }, (_, index) => `row ${index + 1}`).join("\n"),
    ...patch,
  };
}

describe("BashView", () => {
  it("renders command and tail output inside one card", () => {
    const lines = new BashView(plainTheme(), { model: model(), expanded: false }).render(60);
    const text = lines.join("\n");
    expect(lines[0]).toContain("Bash");
    expect(lines[0]).toContain("✓");
    expect(text).toContain("pnpm test");
    expect(text).toContain("row 20");
    expect(text).not.toContain("row 1\n");
    expect(text).toContain("more rows");
    for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(60);
  });

  it("expanded shows all output rows", () => {
    const lines = new BashView(plainTheme(), { model: model(), expanded: true }).render(60).join("\n");
    expect(lines).toContain("row 1");
    expect(lines).toContain("row 20");
    expect(lines).not.toContain("more rows");
  });

  it("shows truncation and full output path notices", () => {
    const text = new BashView(plainTheme(), {
      model: model({
        output: "short",
        truncation: { totalLines: 2100, outputLines: 2000 },
        fullOutputPath: "/tmp/full.log",
      }),
      expanded: false,
    }).render(70).join("\n");
    expect(text).toContain("2100");
    expect(text).toContain("/tmp/full.log");
  });

  it("omits output section when empty and preserves error status", () => {
    const lines = new BashView(plainTheme(), {
      model: model({ status: "error", output: "" }),
      expanded: false,
    }).render(50);
    expect(lines[0]).toContain("✗");
    expect(lines.join("\n")).not.toContain("Output");
  });

  it("keeps every line within width matrix with CJK and long command", () => {
    const widths = [0, 1, 2, 10, 20, 40, 60, 80, 120, 160, 240];
    const stress = {
      status: "error" as const,
      command: `pnpm exec 很长命令 ${"x".repeat(80)}`,
      output: Array.from({ length: 30 }, (_, index) => `第${index + 1}行 emoji 🚀 ${"y".repeat(40)}`).join("\n"),
      durationMs: 128000,
      truncation: { totalLines: 2100, outputLines: 2000 },
      fullOutputPath: "/tmp/非常长的目录/完整输出.log",
    };
    for (const width of widths) {
      const lines = new BashView(plainTheme(), { model: stress, expanded: false }).render(width);
      for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(width);
    }
  });

  it("hides command when native call owns it", () => {
    const lines = new BashView(plainTheme(), { model: model(), expanded: false, showCommand: false }).render(60);
    expect(lines.join("\n")).not.toContain("pnpm test");
  });

  it("sanitizes full output path and shows byte-limit notice", () => {
    const text = new BashView(plainTheme(), {
      model: model({
        output: "x",
        truncation: { totalLines: 1, outputLines: 1, lastLinePartial: true, maxBytes: 51200 },
        fullOutputPath: "/tmp/\u001b]52;c;Zm9v\u0007safe.log",
      }),
      expanded: false,
    }).render(80).join("\n");
    expect(text).not.toContain("\u001b]52");
    expect(text).toContain("bytes");
    expect(text).not.toContain("1 of 1 lines");
  });

  it("normalizes CRLF output", () => {
    const text = new BashView(plainTheme(), {
      model: model({ output: "alpha\r\nbeta\r\n" }),
      expanded: false,
    }).render(60).join("\n");
    expect(text).toContain("alpha");
    expect(text).toContain("beta");
    expect(text).not.toContain("\\r");
  });

  it("honors presentation config", () => {
    const lines = new BashView(plainTheme(), {
      model: model({ output: Array.from({ length: 20 }, (_, i) => `row ${i + 1}`).join("\n"), cwd: "/tmp/project", durationMs: 12 }),
      expanded: false,
      config: { outputRows: 3, showDuration: false, showCwd: true, showTruncation: false, showFullOutputPath: false },
    }).render(60).join("\n");
    expect(lines).not.toContain("12ms");
    expect(lines).toContain("/tmp/project");
    expect(lines).toContain("row 20");
    expect(lines).not.toContain("row 17");
  });

  it("returns no rows for zero width", () => {
    expect(new BashView(plainTheme(), { model: model(), expanded: false }).render(0)).toEqual([]);
  });
});
