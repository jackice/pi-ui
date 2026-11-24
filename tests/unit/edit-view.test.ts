import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import type { EditViewModel } from "../../src/diff/types.ts";
import { EditView } from "../../src/views/edit.ts";

function model(overrides: Partial<EditViewModel> = {}): EditViewModel {
  return {
    status: "success",
    files: [
      {
        path: "src/a.ts",
        operation: "update",
        status: "success",
        additions: 1,
        deletions: 1,
        hunks: [
          {
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [
              { kind: "removed", oldLine: 1, content: "old" },
              { kind: "added", newLine: 1, content: "new" },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("EditView", () => {
  it("composes a panel, file status line and code frame", () => {
    const output = new EditView(plainTheme(), { model: model() })
      .render(80)
      .map(stripTerminalSequences)
      .join("\n");
    expect(output).toContain("Edit");
    expect(output).toContain("success");
    expect(output).toContain("a.ts");
    expect(output).toContain("+1 -1");
    expect(output).toContain("- old");
    expect(output).toContain("+ new");
  });

  it("shows per-file errors and partial status", () => {
    const view = new EditView(plainTheme(), {
      model: model({
        status: "partial",
        files: [
          {
            path: "src/ok.ts",
            operation: "update",
            status: "success",
            additions: 1,
            deletions: 0,
            hunks: [],
          },
          {
            path: "src/broken.ts",
            operation: "unknown",
            status: "error",
            additions: 0,
            deletions: 0,
            hunks: [],
            error: "disk full",
          },
        ],
      }),
    });
    const output = view.render(80).map(stripTerminalSequences).join("\n");
    expect(output).toContain("partial");
    expect(output).toContain("ok.ts");
    expect(output).toContain("broken.ts");
    expect(output).toContain("disk full");
  });

  it("shows an overall error when no files are available", () => {
    const output = new EditView(plainTheme(), {
      model: { status: "error", files: [], error: "parse failed" },
    })
      .render(60)
      .map(stripTerminalSequences)
      .join("\n");
    expect(output).toContain("error");
    expect(output).toContain("parse failed");
  });

  it("limits the number of files when collapsed and shows the rest on expand", () => {
    const files = Array.from({ length: 4 }, (_, index) => ({
      path: `src/file-${index + 1}.ts`,
      operation: "update" as const,
      status: "success" as const,
      additions: 1,
      deletions: 0,
      hunks: [],
    }));
    const view = new EditView(plainTheme(), {
      model: model({ files }),
      maxFiles: 2,
    });
    const collapsed = view.render(80).map(stripTerminalSequences).join("\n");
    expect(collapsed).toContain("file-1.ts");
    expect(collapsed).toContain("file-2.ts");
    expect(collapsed).not.toContain("file-4.ts");
    expect(collapsed).toContain("还有 2 个文件");

    view.setProps({ expanded: true });
    const expanded = view.render(80).map(stripTerminalSequences).join("\n");
    expect(expanded).toContain("file-4.ts");
    expect(expanded).not.toContain("还有 2 个文件");
  });

  it("never exceeds the requested width", () => {
    const view = new EditView(plainTheme(), {
      model: model({
        files: [
          {
            path: "src/中文/very-long-file-name.ts",
            operation: "update",
            status: "error",
            additions: 100,
            deletions: 200,
            hunks: [],
            error: "错误信息很长 ".repeat(20),
            warnings: ["warning ".repeat(20)],
          },
        ],
      }),
      expanded: true,
    });
    for (const width of [0, 1, 2, 10, 40, 80, 120, 240]) {
      const lines = view.render(width);
      if (width === 0) expect(lines).toEqual([]);
      for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(width);
    }
  });
});
