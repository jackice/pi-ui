import { describe, expect, it } from "vitest";

import {
  displayWidth,
  middleTruncate,
  pad,
  sanitizeLine,
  sanitizeText,
  truncate,
  wrap,
} from "../../src/core/ansi.ts";

describe("displayWidth", () => {
  it("uses terminal columns for CJK, emoji and combining marks", () => {
    expect(displayWidth("中文")).toBe(4);
    expect(displayWidth("🙂")).toBe(2);
    expect(displayWidth("e\u0301")).toBe(1);
    expect(displayWidth("\x1b[31mred\x1b[0m")).toBe(3);
  });
});

describe("sanitize", () => {
  it("removes CSI styling and OSC links", () => {
    const link = "\x1b]8;;https://evil.example\x07click\x1b]8;;\x07";
    expect(sanitizeLine("\x1b[31mred\x1b[0m")).toBe("red");
    const cleaned = sanitizeLine(link);
    expect(cleaned).toContain("click");
    expect(cleaned).not.toContain("\x1b");
    expect(cleaned).not.toContain("\x07");
  });

  it("replaces remaining control characters and keeps line breaks in text", () => {
    const cleaned = sanitizeLine("a\x00b\x07c");
    expect(cleaned).not.toMatch(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/);
    expect(sanitizeText("a\nb")).toBe("a\nb");
  });

  it("removes DCS and C1 DCS payloads", () => {
    const dcs = sanitizeLine("a\x1bP1;2|payload\x1b\\b");
    expect(dcs).toBe("ab");

    const c1 = sanitizeLine("a\x90payload\x9cb");
    expect(c1).toBe("ab");

    const unterminated = sanitizeLine("a\x1bPpayload");
    expect(unterminated).not.toContain("\x1b");
    expect(unterminated).not.toContain("payload");
  });
});

describe("truncate and pad", () => {
  it("never exceeds the requested width", () => {
    for (const width of [0, 1, 2, 3, 4, 10]) {
      expect(displayWidth(truncate("abcdef", width))).toBeLessThanOrEqual(width);
    }
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abcdef", 0)).toBe("");
    expect(truncate("中文中文", 5)).toBe("中文…");
  });

  it("pads to exact display width", () => {
    expect(displayWidth(pad("中", 4))).toBe(4);
    expect(displayWidth(pad("ab", 2))).toBe(2);
    expect(pad("abcd", 2)).toBe("ab");
    expect(pad("", 0)).toBe("");
  });
});

describe("wrap", () => {
  it("keeps every wrapped line inside the width", () => {
    const lines = wrap("hello world 中文", 6);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(6);
  });

  it("returns no lines for non-positive width", () => {
    expect(wrap("hello", 0)).toEqual([]);
  });
});

describe("middleTruncate", () => {
  it("keeps the basename and stays inside the width", () => {
    const result = middleTruncate("/very/long/path/file.ts", 10);
    expect(displayWidth(result)).toBeLessThanOrEqual(10);
    expect(result).toContain("file.ts");
    expect(result.startsWith("…")).toBe(true);
  });

  it("returns the input when it already fits", () => {
    expect(middleTruncate("a/b.ts", 10)).toBe("a/b.ts");
    expect(middleTruncate("a/b.ts", 0)).toBe("");
  });
});
