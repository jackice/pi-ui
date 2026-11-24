import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme, type UiTheme } from "../../src/core/theme.ts";
import { StatusLine } from "../../src/components/status-line.ts";

describe("StatusLine", () => {
  it("keeps meta right aligned and the path basename visible", () => {
    const line = new StatusLine(plainTheme(), {
      icon: "●",
      title: "hashline",
      path: "src/very/long/path/file.ts",
      meta: "+2 -1",
    }).render(40);
    expect(line).toHaveLength(1);
    expect(displayWidth(line[0] ?? "")).toBe(40);
    expect(line[0]?.startsWith("●")).toBe(true);
    expect(line[0]).toContain("file.ts");
    expect(line[0]?.endsWith("+2 -1")).toBe(true);
  });

  it("preserves the status meta when the width is narrow", () => {
    const status = new StatusLine(plainTheme(), {
      icon: "●",
      title: "a very long running title",
      path: "src/very/long/path/file.ts",
      meta: "12%",
    });
    for (const width of [5, 8, 12]) {
      const line = status.render(width)[0] ?? "";
      expect(displayWidth(line)).toBe(width);
      expect(line).toContain("12%");
    }
  });

  it("truncates the title only after the meta is safeguarded", () => {
    const line = new StatusLine(plainTheme(), {
      title: "中文字符串很长",
      meta: "done",
    }).render(12)[0];
    expect(displayWidth(line ?? "")).toBe(12);
    expect(line?.endsWith("done")).toBe(true);
  });

  it("maps title and meta to theme tones", () => {
    const tones: string[] = [];
    const theme: UiTheme = {
      fg(tone, text) {
        tones.push(tone);
        return text;
      },
      bold: (text) => text,
    };
    new StatusLine(theme, {
      icon: "!",
      title: "Title",
      meta: "meta",
      path: "a/b.ts",
      tone: "warning",
    }).render(40);
    expect(tones).toContain("accent");
    expect(tones).toContain("warning");
    expect(tones).toContain("muted");
  });

  it("sanitizes untrusted fields", () => {
    const output = new StatusLine(plainTheme(), {
      title: "\x1b[31mT\x1b[0m",
      meta: "m\x07",
      path: "\x1b]8;;x\x07p\x1b]8;;\x07",
    }).render(30)[0];
    expect(output).toContain("T");
    expect(output).not.toContain("\x1b");
    expect(output).not.toContain("\x07");
  });

  it("never exceeds the requested width", () => {
    const status = new StatusLine(plainTheme(), {
      icon: "●",
      title: "中文标题 and a long english title",
      path: "/a/b/c/d/e/f/g/file.ts",
      meta: "+123 -456",
    });
    for (const width of [0, 1, 2, 3, 10, 40, 80, 120, 240]) {
      const lines = status.render(width);
      if (width === 0) expect(lines).toEqual([]);
      for (const line of lines) {
        expect(displayWidth(line)).toBeLessThanOrEqual(width);
        expect(line).not.toContain("\n");
      }
    }
  });

  it("updates props and theme", () => {
    const status = new StatusLine(plainTheme(), { title: "old" });
    expect(status.render(20)[0]).toContain("old");
    status.setProps({ title: "new" });
    expect(status.render(20)[0]).toContain("new");
    status.setTheme({ fg: (_t, text) => `<${text}>`, bold: (text) => text });
    expect(status.render(20)[0]).toContain("<new>");
  });
});
