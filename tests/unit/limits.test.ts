import { describe, expect, it } from "vitest";

import { clampUtf8 } from "../../src/core/limits.ts";

describe("clampUtf8", () => {
  it("does not leave dangling ZWJ or half a flag", () => {
    const family = "👩‍👩‍👧‍👦".repeat(10);
    const cut = clampUtf8(family, 100).text;
    expect(cut.endsWith("\u200D")).toBe(false);

    const flags = "🇨🇳".repeat(20);
    const flagCut = clampUtf8(flags, 50).text;
    const tail = [...flagCut].slice(-2);
    const regional = tail.filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code >= 0x1f1e6 && code <= 0x1f1ff;
    });
    expect(regional.length % 2).toBe(0);
  });
});
