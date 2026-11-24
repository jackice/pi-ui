import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { Panel, type Renderable } from "../../src/components/panel.ts";

function child(lines: string[], seen: number[] = []): Renderable {
  return {
    render(width: number) {
      seen.push(width);
      return lines.map((line) => line.slice(0, width));
    },
  };
}

describe("Panel", () => {
  it("draws a bordered shell at the exact width", () => {
    const seen: number[] = [];
    const panel = new Panel(plainTheme(), {
      title: "Edit",
      titleRight: "+2 -1",
      border: "rounded",
      paddingX: 1,
      paddingY: 1,
      children: [child(["src/app.ts", "line two"], seen)],
    });

    const lines = panel.render(40);
    expect(lines).toHaveLength(6);
    for (const line of lines) expect(displayWidth(line)).toBe(40);
    expect(lines[0]).toContain("Edit");
    expect(lines[0]).toContain("+2 -1");
    expect(lines[0]?.startsWith("╭")).toBe(true);
    expect(lines.at(-1)?.startsWith("╰")).toBe(true);
    expect(lines.at(-1)?.endsWith("╯")).toBe(true);
    expect(seen).toEqual([36]);
  });

  it("supports square and no-border variants", () => {
    const square = new Panel(plainTheme(), {
      title: "S",
      border: "square",
      paddingX: 0,
      children: [child(["x"])],
    });
    expect(square.render(10)[0]?.startsWith("┌")).toBe(true);

    const none = new Panel(plainTheme(), {
      title: "Title",
      titleRight: "meta",
      border: "none",
      paddingX: 1,
      children: [child(["body"])],
    });
    const lines = none.render(12);
    expect(lines.join("\n")).not.toContain("│");
    expect(lines[0]).toContain("Title");
    expect(lines[0]).toContain("meta");
    expect(lines[1]).toContain("body");
    expect(lines.every((line) => displayWidth(line) <= 12)).toBe(true);
  });

  it("sanitizes untrusted titles and never emits terminal control sequences", () => {
    const panel = new Panel(plainTheme(), {
      title: "\x1b]8;;https://evil.example\x07Title\x1b]8;;\x07",
      titleRight: "a\x00b",
      children: [child(["body"])],
    });
    const output = panel.render(30).join("\n");
    expect(output).toContain("Title");
    expect(output).not.toContain("\x1b");
    expect(output).not.toContain("\x07");
    expect(output).not.toContain("\x00");
  });

  it("updates props and theme, and invalidate is idempotent", () => {
    const panel = new Panel(plainTheme(), {
      title: "Old",
      children: [child(["body"])],
    });
    expect(panel.render(20).join("\n")).toContain("Old");

    panel.setProps({ title: "New", children: [child(["body"])] });
    expect(panel.render(20).join("\n")).toContain("New");

    panel.setTheme({
      fg: (_tone, text) => `\x1b[36m${text}\x1b[0m`,
      bold: (text) => `\x1b[1m${text}\x1b[0m`,
    });
    const styled = panel.render(20).join("\n");
    expect(styled).toContain("\x1b[36m");
    expect(styled).toContain("New");

    panel.invalidate();
    panel.invalidate();
    expect(panel.render(20).join("\n")).toBe(styled);

    panel.setTheme(plainTheme());
    expect(panel.render(20).join("\n")).not.toContain("\x1b");
  });

  it("degrades without exceeding tiny widths", () => {
    const panel = new Panel(plainTheme(), {
      title: "A long title",
      titleRight: "right",
      border: "rounded",
      paddingX: 2,
      children: [child(["中文内容"])],
    });
    for (const width of [0, 1, 2, 3, 4, 5]) {
      const lines = panel.render(width);
      for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(width);
    }
    expect(panel.render(0)).toEqual([]);
  });

  it("does not mutate cached lines when callers read them", () => {
    const panel = new Panel(plainTheme(), { children: [child(["body"])] });
    const first = panel.render(10);
    const second = panel.render(10);
    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(false);
  });
});
