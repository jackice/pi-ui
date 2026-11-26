import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { ReadView, type ReadViewModel } from "../../src/views/read.ts";

const lines = Array.from({ length: 20 }, (_, index) => ({ text: `line ${index + 5}`, number: index + 5 }));

function model(patch: Partial<ReadViewModel> = {}): ReadViewModel {
  return {
    status: "success",
    path: "src/app.ts",
    source: "native",
    contentKind: "code",
    lines,
    requestedOffset: 5,
    requestedLimit: 20,
    ...patch,
  };
}

describe("ReadView", () => {
  it("renders head preview with real line numbers", () => {
    const text = new ReadView(plainTheme(), { model: model(), expanded: false }).render(60).join("\n");
    expect(text).toContain("Read");
    expect(text).toContain("line 5");
    expect(text).toContain("line 16");
    expect(text).not.toContain("line 17");
    for (const line of text.split("\n")) expect(displayWidth(line)).toBeLessThanOrEqual(60);
  });

  it("expands to all lines and shows truncation notice", () => {
    const text = new ReadView(plainTheme(), {
      model: model({ truncation: { outputLines: 20, totalLines: 100 } }),
      expanded: true,
    }).render(60).join("\n");
    expect(text).toContain("line 5");
    expect(text).toContain("line 24");
    expect(text).toContain("truncated");
  });

  it("renders raw fallback without numbering", () => {
    const text = new ReadView(plainTheme(), {
      model: model({ lines: [], rawFallback: "raw diagnostic text", contentKind: "unknown" }),
      expanded: false,
    }).render(50).join("\n");
    expect(text).toContain("raw diagnostic text");
  });

  it("returns no rows for zero width", () => {
    expect(new ReadView(plainTheme(), { model: model(), expanded: false }).render(0)).toEqual([]);
  });
});
