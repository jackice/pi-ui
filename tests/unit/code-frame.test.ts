import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { CodeFrame } from "../../src/components/code-frame.ts";
import type { DiffHunk } from "../../src/diff/types.ts";

function hunk(lines: DiffHunk["lines"]): DiffHunk {
  const olds = lines.flatMap((line) => (line.oldLine === undefined ? [] : [line.oldLine]));
  const news = lines.flatMap((line) => (line.newLine === undefined ? [] : [line.newLine]));
  return {
    oldStart: olds[0] ?? 0,
    oldLines: olds.length,
    newStart: news[0] ?? 0,
    newLines: news.length,
    lines,
  };
}

const sample = hunk([
  { kind: "context", oldLine: 1, newLine: 1, content: "one" },
  { kind: "removed", oldLine: 2, content: "two" },
  { kind: "added", newLine: 2, content: "TWO" },
  { kind: "context", oldLine: 3, newLine: 3, content: "three" },
]);

describe("CodeFrame", () => {
  it("renders both-gutter line numbers and change markers", () => {
    const lines = new CodeFrame(plainTheme(), { hunks: [sample] }).render(80).map(stripTerminalSequences);
    expect(lines[0]).toContain("1 1 │   one");
    expect(lines[1]).toContain("2   │ - two");
    expect(lines[2]).toContain("  2 │ + TWO");
    expect(lines[3]).toContain("3 3 │   three");
  });

  it("wraps without faking new line numbers", () => {
    const long = hunk([
      { kind: "added", newLine: 7, content: "abcdefghijklmnopqrstuvwxyz" },
    ]);
    const lines = new CodeFrame(plainTheme(), { hunks: [long] }).render(24).map(stripTerminalSequences);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(24);
    expect(lines[0]).toContain("7 │ + ");
    for (const line of lines.slice(1)) {
      expect(line).not.toMatch(/\d+ │ [+-]/);
      expect(line).toContain("↪");
    }
  });

  it("expands tabs and sanitizes untrusted content", () => {
    const lines = new CodeFrame(plainTheme(), {
      hunks: [
        hunk([
          { kind: "added", newLine: 1, content: "\t\x1b[31mred\x1b[0m" },
        ]),
      ],
      indentGuides: true,
    }).render(80).map(stripTerminalSequences);
    expect(lines[0]).toContain("→   red");
    expect(lines[0]).not.toContain("\x1b");
  });

  it("folds hunks and lines with an explicit notice", () => {
    const many = Array.from({ length: 6 }, (_, index) =>
      hunk([{ kind: "added", newLine: index + 1, content: `line ${index + 1}` }]),
    );
    const lines = new CodeFrame(plainTheme(), { hunks: many, maxHunks: 2 }).render(80).map(stripTerminalSequences);
    expect(lines.join("\n")).toContain("已折叠");
    expect(lines.length).toBeLessThan(10);

    const expanded = new CodeFrame(plainTheme(), { hunks: many, maxHunks: 2, expanded: true })
      .render(80)
      .map(stripTerminalSequences);
    expect(expanded.join("\n")).not.toContain("已折叠");
    expect(expanded.join("\n")).toContain("line 6");
  });

  it("distinguishes source truncation from UI folding", () => {
    const lines = new CodeFrame(plainTheme(), {
      hunks: [sample],
      sourceTruncated: true,
    }).render(80).map(stripTerminalSequences);
    expect(lines.join("\n")).toContain("结果已截断");
  });

  it("never exceeds the requested width", () => {
    const frame = new CodeFrame(plainTheme(), {
      hunks: [
        hunk([
          { kind: "context", oldLine: 9, newLine: 9, content: "中文上下文 🙂" },
          { kind: "removed", oldLine: 10, content: "x".repeat(60) },
          { kind: "added", newLine: 10, content: "y".repeat(60) },
        ]),
      ],
    });

    for (const width of [0, 1, 2, 3, 4, 5, 10, 40, 80, 120, 240]) {
      const lines = frame.render(width);
      if (width === 0) expect(lines).toEqual([]);
      for (const line of lines) {
        expect(displayWidth(line)).toBeLessThanOrEqual(width);
        expect(line).not.toContain("\n");
      }
    }
  });

  it("updates theme and invalidates", () => {
    const frame = new CodeFrame(plainTheme(), { hunks: [sample] });
    expect(frame.render(40).join("\n")).not.toContain("\x1b");
    frame.setTheme({ fg: (_tone, text) => `<${text}>`, bold: (text) => text });
    expect(frame.render(40).join("\n")).toContain("<");
    frame.invalidate();
    expect(frame.render(40).join("\n")).toBe(frame.render(40).join("\n"));
  });
});
