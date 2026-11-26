import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { WriteView, type WriteViewModel } from "../../src/views/write.ts";

const content = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join("\n");

function model(patch: Partial<WriteViewModel> = {}): WriteViewModel {
  return { status: "success", path: "src/app.ts", content, argsComplete: true, lineCount: 20, ...patch };
}

describe("WriteView", () => {
  it("renders head preview with path and line count", () => {
    const lines = new WriteView(plainTheme(), { model: model(), expanded: false }).render(60);
    const text = lines.join("\n");
    expect(lines[0]).toContain("Write");
    expect(text).toContain("src/app.ts");
    expect(text).toContain("20");
    expect(text).toContain("line 1");
    expect(text).toContain("line 6");
    expect(text).not.toContain("line 7");
    for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(60);
  });

  it("streams tail while args incomplete", () => {
    const text = new WriteView(plainTheme(), {
      model: model({ status: "streaming", argsComplete: false }),
      expanded: false,
    }).render(60).join("\n");
    expect(text).toContain("line 15");
    expect(text).toContain("line 20");
    expect(text).not.toContain("line 5");
  });

  it("expands to all lines", () => {
    const text = new WriteView(plainTheme(), { model: model(), expanded: true }).render(60).join("\n");
    expect(text).toContain("line 1");
    expect(text).toContain("line 20");
  });

  it("omits body for empty content and hides preview on error", () => {
    const empty = new WriteView(plainTheme(), {
      model: model({ content: "", lineCount: 0 }),
      expanded: false,
    }).render(50).join("\n");
    expect(empty).not.toContain("line 1");

    const error = new WriteView(plainTheme(), {
      model: model({ status: "error", notices: ["permission denied"] }),
      expanded: false,
    }).render(50).join("\n");
    expect(error).toContain("permission denied");
    expect(error).not.toContain("line 1");
  });

  it("shows requested content for expanded error", () => {
    const text = new WriteView(plainTheme(), {
      model: model({ status: "error", notices: ["EISDIR"] }),
      expanded: true,
    }).render(60).join("\n");
    expect(text).toContain("line 1");
    expect(text).toContain("EISDIR");
  });

  it("does not number a single trailing LF as an extra line", () => {
    const text = new WriteView(plainTheme(), {
      model: model({ content: "alpha\nbeta\n", lineCount: 2 }),
      expanded: true,
    }).render(40).join("\n");
    expect(text).toContain("alpha");
    expect(text).toContain("beta");
    expect(text).not.toMatch(/3\s+$/m);
  });

  it("splits and truncates multiline diagnostics without breaking width", () => {
    const lines = new WriteView(plainTheme(), {
      model: model({ status: "error", notices: ["EACCES: permission denied\nfull stack line 2"] }),
      expanded: false,
    }).render(30);
    const text = lines.join("\n");
    expect(text).toContain("EACCES");
    expect(text).not.toContain("\nfull stack");
    for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(30);
  });

  it("returns no rows for zero width", () => {
    expect(new WriteView(plainTheme(), { model: model(), expanded: false }).render(0)).toEqual([]);
  });
});

describe("WriteView safety", () => {
  it("does not fake hidden line counts beyond 20k", async () => {
    const { WriteView } = await import("../../src/views/write.ts");
    const content = Array.from({ length: 30000 }, (_, index) => `line ${index + 1}`).join("\n");
    const text = new WriteView(plainTheme(), {
      model: { status: "success", path: "big.txt", content, argsComplete: true, lineCount: 30000 },
      expanded: false,
    }).render(60).join("\n");
    expect(text).toContain("UI safety limit");
    expect(text).not.toContain("more lines");
  });
});
