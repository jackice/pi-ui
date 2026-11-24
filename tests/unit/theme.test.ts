import { describe, expect, it } from "vitest";

import { fromPiTheme, plainTheme, type ThemeLike } from "../../src/core/theme.ts";

function tokenTheme(): ThemeLike & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    fg(token: string, text: string) {
      calls.push(token);
      return `<${token}>${text}</${token}>`;
    },
    bold(text: string) {
      return `<b>${text}</b>`;
    },
  };
}

describe("fromPiTheme", () => {
  it("maps semantic tones to real Pi tokens", () => {
    const theme = tokenTheme();
    const ui = fromPiTheme(theme);
    expect(ui.fg("added", "+1")).toBe("<success>+1</success>");
    expect(ui.fg("removed", "-1")).toBe("<error>-1</error>");
    expect(ui.fg("border", "|")).toBe("<border>|</border>");
    expect(ui.fg("warning", "!")).toBe("<warning>!</warning>");
    expect(ui.bold("x")).toBe("<b>x</b>");
  });

  it("degrades to unstyled text when the host theme rejects a token", () => {
    const theme: ThemeLike = {
      fg() {
        throw new Error("unknown token");
      },
      bold() {
        throw new Error("unknown token");
      },
    };
    const ui = fromPiTheme(theme);
    expect(ui.fg("accent", "x")).toBe("x");
    expect(ui.bold("x")).toBe("x");
  });
});

describe("plainTheme", () => {
  it("is identity for deterministic tests and gallery", () => {
    expect(plainTheme().fg("error", "x")).toBe("x");
    expect(plainTheme().bold("x")).toBe("x");
  });
});
