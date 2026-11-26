import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { ToolCard } from "../../src/components/tool-card.ts";

const props = {
  title: "Bash",
  status: "success" as const,
  meta: ["2.8s"],
  sections: [
    { title: "Output", rows: ["Tests 128 passed", "… 2 rows hidden"] },
    { rows: ["tail only"] },
  ],
};

describe("ToolCard", () => {
  it("draws one rounded card with title, status and sections", () => {
    const lines = new ToolCard(plainTheme(), props).render(48);
    expect(lines[0]?.startsWith("╭")).toBe(true);
    expect(lines[0]).toContain("Bash");
    expect(lines.at(-1)?.startsWith("╰")).toBe(true);
    for (const line of lines) expect(displayWidth(line)).toBe(48);
    const text = lines.join("\n");
    expect(text).toContain("Output");
    expect(text).toContain("Tests 128 passed");
    expect(lines.filter((line) => line.startsWith("╭"))).toHaveLength(1);
  });

  it("keeps every line within narrow widths", () => {
    for (const width of [0, 1, 4, 10, 20]) {
      const lines = new ToolCard(plainTheme(), props).render(width);
      for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(width);
      if (width === 0) expect(lines).toEqual([]);
    }
  });

  it("preserves whitelisted SGR in section rows", () => {
    const lines = new ToolCard(plainTheme(), {
      title: "Bash",
      status: "success",
      sections: [{ rows: ["\u001b[31mred\u001b[0m"] }],
    }).render(40);
    expect(lines.join("\n")).toContain("\u001b[31m");
  });

  it("omits empty sections and sanitizes control characters", () => {
    const lines = new ToolCard(plainTheme(), {
      title: "Write\u001b[31m",
      status: "streaming",
      sections: [{ rows: [] }, { title: "Code", rows: ["x\u0007y"] }],
    }).render(30);
    const text = lines.join("\n");
    expect(text).not.toContain("\u001b");
    expect(text).not.toContain("\u0007");
    expect(text).toContain("Write");
    expect(text).toContain("Code");
  });
});
