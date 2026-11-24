import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { Panel } from "../../src/components/panel.ts";
import { StatusLine } from "../../src/components/status-line.ts";

const WIDTHS = [0, 1, 2, 10, 40, 80, 120, 240] as const;

describe("G1 width matrix", () => {
  it("Panel never escapes the host width", () => {
    for (const width of WIDTHS) {
      const panel = new Panel(plainTheme(), {
        title: "⚠ 危险操作 confirmation",
        titleRight: "+999 -999",
        border: "rounded",
        paddingX: 1,
        paddingY: 1,
        children: [
          {
            render: (inner) => [
              "中文内容 / emoji 🙂 / combining e\u0301 / tab\tstop",
              "x".repeat(inner + 20),
            ],
          },
        ],
      });
      const lines = panel.render(width);
      expect(Array.isArray(lines)).toBe(true);
      for (const line of lines) {
        expect(displayWidth(line)).toBeLessThanOrEqual(width);
        expect(line).not.toContain("\n");
      }
      if (width >= 4) {
        for (const line of lines) expect(displayWidth(line)).toBe(width);
      }
    }
  });

  it("StatusLine never escapes the host width", () => {
    for (const width of WIDTHS) {
      const status = new StatusLine(plainTheme(), {
        icon: "●",
        title: "running 中文任务",
        path: "/a/very/long/path/中文/文件名.ts",
        meta: "12% +1 -1",
      });
      const lines = status.render(width);
      if (width === 0) expect(lines).toEqual([]);
      for (const line of lines) {
        expect(displayWidth(line)).toBeLessThanOrEqual(width);
        expect(line).not.toContain("\n");
      }
      if (width > 0) expect(displayWidth(lines[0] ?? "")).toBe(width);
    }
  });
});
