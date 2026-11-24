import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { joinSides, normalizeWidth, rule } from "../../src/core/layout.ts";

describe("normalizeWidth", () => {
  it("floors and clamps negative input", () => {
    expect(normalizeWidth(10.9)).toBe(10);
    expect(normalizeWidth(-3)).toBe(0);
    expect(normalizeWidth(Number.NaN)).toBe(0);
  });
});

describe("joinSides", () => {
  it("right aligns the secondary text", () => {
    const line = joinSides("left", "meta", 12);
    expect(displayWidth(line)).toBe(12);
    expect(line.endsWith("meta")).toBe(true);
    expect(line.startsWith("left")).toBe(true);
  });

  it("keeps the right side when space is tight", () => {
    const line = joinSides("very long title", "12%", 5);
    expect(displayWidth(line)).toBeLessThanOrEqual(5);
    expect(line).toContain("12%");
  });

  it("can omit the gap at width boundaries", () => {
    expect(displayWidth(joinSides("a", "b", 2))).toBe(2);
    expect(joinSides("a", "b", 1)).toBe("b");
  });
});

describe("rule", () => {
  it("fills exactly the requested width", () => {
    expect(displayWidth(rule(0))).toBe(0);
    expect(displayWidth(rule(7))).toBe(7);
    expect(rule(3, "=")).toBe("===");
  });
});
