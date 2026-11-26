import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { OutputBlock } from "../../src/components/output-block.ts";
import { sanitizeSgr } from "../../src/core/safe-sgr.ts";

const preview = (direction: "head" | "tail", maxVisualRows = 3) => ({
  direction,
  maxVisualRows,
  expanded: false,
});

describe("sanitizeSgr", () => {
  it("keeps allowed SGR and strips OSC, cursor moves and bidi", () => {
    const input = "\u001b[31mred\u001b[0m \u001b]52;c;Zm9v\u0007\u001b[2J\u001b[1A\u202Eok";
    const output = sanitizeSgr(input, true);
    expect(output).toContain("\u001b[31m");
    expect(output).toContain("\u001b[0m");
    expect(output).not.toContain("\u001b]52");
    expect(output).not.toContain("\u001b[2J");
    expect(output).not.toContain("\u001b[1A");
    expect(output).not.toContain("\u202E");
    expect(output).toContain("red");
    expect(output).toContain("ok");
  });

  it("removes all SGR when colors are disabled", () => {
    expect(sanitizeSgr("\u001b[31mred\u001b[0m", false)).toBe("red");
  });

  it("rejects malformed and non-whitelisted SGR parameters", () => {
    const output = sanitizeSgr("\u001b[48;5;9mX\u001b[38;5;300mY\u001b[1;999mZ\u001b[31;1mW", true);
    expect(output).not.toContain("48;5;9");
    expect(output).not.toContain("38;5;300");
    expect(output).not.toContain("999");
    expect(output).toContain("\u001b[31;1m");
    expect(output.replace(/\u001b\[[0-9;]*m/g, "")).toBe("XYZW");
  });
});

describe("OutputBlock", () => {
  it("renders tail rows with a hidden summary", () => {
    const rows = Array.from({ length: 20 }, (_, index) => `row ${index + 1}`);
    const lines = new OutputBlock(plainTheme(), { rows, ansi: false, preview: preview("tail") });
    const rendered = lines.render(30);
    expect(rendered[0]).toContain("17");
    expect(rendered.join("\n")).toContain("row 20");
    expect(rendered.join("\n")).not.toContain("row 15");
    for (const line of rendered) expect(displayWidth(line)).toBeLessThanOrEqual(30);
  });

  it("strips forbidden control sequences even in expanded mode", () => {
    const block = new OutputBlock(plainTheme(), {
      rows: ["\u001b[31mok\u001b[0m\u001b[2J\u001b]8;;x\u0007link"],
      ansi: true,
      preview: { direction: "head", maxVisualRows: 10, expanded: true },
    });
    const text = block.render(40).join("\n");
    expect(text).toContain("ok");
    expect(text).not.toContain("\u001b[2J");
    expect(text).not.toContain("\u001b]8");
    expect(displayWidth(text)).toBeLessThanOrEqual(40);
  });

  it("filters extended bidi/zero-width controls but keeps ZWJ", () => {
    const output = sanitizeSgr("a\u200Fb\u061Cc\u200Bd\u2060e👩\u200D🚀", true);
    expect(output).toBe("abcde👩\u200D🚀");
  });

  it("shows a safety notice for oversized input", () => {
    const rows = Array.from({ length: 20001 }, () => "x");
    const rendered = new OutputBlock(plainTheme(), { rows, ansi: false, preview: preview("head") }).render(30);
    expect(rendered.join("\n")).toContain("UI safety limit");
  });

  it("returns no rows for zero width", () => {
    expect(new OutputBlock(plainTheme(), { rows: ["x"], ansi: false, preview: preview("head") }).render(0)).toEqual([]);
  });
});
