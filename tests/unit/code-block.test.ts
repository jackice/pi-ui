import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { CodeBlock } from "../../src/components/code-block.ts";

const lines = [
  { text: "const a = 1;", number: 1 },
  { text: "const b = 2;", number: 2 },
  { text: "const c = 3;", number: 3 },
  { text: "const d = 4;", number: 4 },
];

const preview = (direction: "head" | "tail", maxLogicalLines = 2): {
  direction: "head" | "tail"; maxLogicalLines: number; maxVisualRows: number; expanded: boolean;
} => ({ direction, maxLogicalLines, maxVisualRows: 10, expanded: false });

describe("CodeBlock", () => {
  it("renders head lines with aligned line numbers", () => {
    const rows = new CodeBlock(plainTheme(), { lines, showLineNumbers: true, preview: preview("head") }).render(40);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain("1");
    expect(rows[0]).toContain("const a = 1;");
    expect(rows[1]).toContain("const b = 2;");
    expect(rows.at(-1)).toContain("more lines");
    for (const row of rows) expect(displayWidth(row)).toBeLessThanOrEqual(40);
  });

  it("keeps tail lines for streaming content", () => {
    const rows = new CodeBlock(plainTheme(), { lines, showLineNumbers: true, preview: preview("tail") }).render(40);
    expect(rows.join("\n")).toContain("const c = 3;");
    expect(rows.join("\n")).toContain("const d = 4;");
    expect(rows.join("\n")).not.toContain("const a = 1;");
    expect(rows[0]).toContain("more lines");
  });

  it("wraps long lines and leaves continuation gutter blank", () => {
    const rows = new CodeBlock(plainTheme(), {
      lines: [{ text: "x".repeat(40), number: 7 }],
      showLineNumbers: true,
      preview: { direction: "head", maxVisualRows: 3, expanded: false },
    }).render(12);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0]).toContain("7");
    expect(rows[1]?.trimStart().startsWith("x")).toBe(true);
    for (const row of rows) expect(displayWidth(row)).toBeLessThanOrEqual(12);
  });

  it("supports missing numbers, no-gutter and sanitizes control characters", () => {
    const rows = new CodeBlock(plainTheme(), {
      lines: [{ text: "a\u001b[31mb\u0007c", number: null }],
      showLineNumbers: true,
      preview: preview("head", 10),
    }).render(20);
    expect(rows.join("\n")).not.toContain("\u001b");
    expect(rows.join("\n")).not.toContain("\u0007");
    expect(rows.join("\n")).toMatch(/ab\s?c/);

    const bare = new CodeBlock(plainTheme(), {
      lines: [{ text: "plain", number: 1 }],
      showLineNumbers: false,
      preview: preview("head", 10),
    }).render(20);
    expect(bare.join("\n")).not.toContain("1");
  });

  it("warns when visual rows are truncated without logical limit", () => {
    const rows = new CodeBlock(plainTheme(), {
      lines: [{ text: "x".repeat(100), number: 1 }],
      showLineNumbers: false,
      preview: { direction: "head", maxVisualRows: 3, expanded: false },
    }).render(20);
    expect(rows.length).toBe(4);
    expect(rows.join("\n")).toContain("partial content");
  });

  it("warns when safety limits truncate input", () => {
    const lines = Array.from({ length: 20001 }, (_, index) => ({ text: `l${index}`, number: index + 1 }));
    const rows = new CodeBlock(plainTheme(), {
      lines,
      showLineNumbers: false,
      preview: { direction: "head", maxVisualRows: 5, expanded: true },
    }).render(40);
    expect(rows.join("\n")).toContain("UI safety limit");
  });

  it("returns no rows for zero width", () => {
    expect(new CodeBlock(plainTheme(), { lines, showLineNumbers: true, preview: preview("head") }).render(0)).toEqual([]);
  });
});
