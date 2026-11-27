import {
  replaceControlCharacters,
  sliceByColumn,
  stripTerminalSequences,
  truncateToWidth,
  visibleWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";

import {
  replaceControlCharacters as localReplace,
  sliceByColumn as localSlice,
  stripTerminalSequences as localStrip,
  truncateToWidth as localTruncate,
  visibleWidth as localWidth,
  wrapTextWithAnsi as localWrap,
} from "../../src/core/pi-tui-compat.ts";

const samples = [
  "",
  "plain ascii",
  "中文🙂混合",
  "👨‍👩‍👧‍👦 family",
  "🇨🇳 flag",
  "e\u0301 combining",
  "\x1b[31mred\x1b[0m",
  "\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\",
  "tab\there",
  "\u0000control\u0007",
  "\u202Ereversed\u202C",
  "a".repeat(120),
];

function randomText(seed: number): string {
  const alphabet = ["a", "中", "🙂", "e\u0301", "\x1b[32m", "\x1b[0m", "\t", " ", "🇨🇳", "\u200D"];
  let state = seed;
  let text = "";
  for (let index = 0; index < 30; index++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    text += alphabet[state % alphabet.length];
  }
  return text;
}

describe("vendored pi-tui ANSI compatibility", () => {
  it("matches the public pi-tui oracle on edge samples", () => {
    for (const text of samples) {
      expect(localWidth(text)).toBe(visibleWidth(text));
      expect(localStrip(text)).toBe(stripTerminalSequences(text));
      expect(localReplace(text)).toBe(replaceControlCharacters(text));
      for (const width of [1, 2, 5, 10, 20]) {
        expect(localWrap(text, width)).toEqual(wrapTextWithAnsi(text, width));
        expect(localTruncate(text, width, "…")).toBe(truncateToWidth(text, width, "…"));
      }
      for (const [start, end] of [[0, 5], [2, 8], [5, 5], [10, 4]] as const) {
        expect(localSlice(text, start, end, true)).toBe(sliceByColumn(text, start, end, true));
      }
    }
  });

  it("matches the public pi-tui oracle on deterministic random text", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const text = randomText(seed);
      expect(localWidth(text)).toBe(visibleWidth(text));
      expect(localWrap(text, 7)).toEqual(wrapTextWithAnsi(text, 7));
      expect(localTruncate(text, 9, "…")).toBe(truncateToWidth(text, 9, "…"));
    }
  });
});
