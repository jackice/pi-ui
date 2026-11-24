import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, test } from "vitest";

import {
  adaptHashlineDetails,
  CodeFrame,
  EditView,
  Panel,
  plainTheme,
  StatusLine,
  TodoView,
  type TodoViewModel,
  type UiTheme,
} from "../../src/index.ts";

function text(lines: readonly string[]): string {
  return stripTerminalSequences(lines.join("\n"));
}

const ansiTheme: UiTheme = {
  fg: (tone, value) => `\x1b[38;5;${tone === "error" || tone === "removed" ? 203 : 81}m${value}\x1b[0m`,
  bold: (value) => `\x1b[1m${value}\x1b[22m`,
};

describe("snapshots", () => {
  test("Panel", () => {
    const panel = new Panel(plainTheme(), {
      title: "Edit",
      titleRight: "+2 -1",
      children: [{ render: () => ["line one", "中文内容", "🙂 emoji"] }],
    });
    expect(text(panel.render(40))).toMatchSnapshot();
  });

  test("StatusLine", () => {
    const line = new StatusLine(plainTheme(), {
      icon: "●",
      title: "hashline",
      path: "src/very/long/path/file.ts",
      meta: "+2 -1",
    });
    expect(text(line.render(50))).toMatchSnapshot();
  });

  test("CodeFrame", () => {
    const frame = new CodeFrame(plainTheme(), {
      hunks: [
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 3,
          lines: [
            { kind: "context", oldLine: 1, newLine: 1, content: "export function run() {" },
            { kind: "removed", oldLine: 2, content: "\treturn oldValue;" },
            { kind: "added", newLine: 2, content: "\treturn newValue;" },
            { kind: "context", oldLine: 3, newLine: 3, content: "}" },
          ],
        },
      ],
      indentGuides: true,
    });
    expect(text(frame.render(60))).toMatchSnapshot();
  });

  test("EditView", () => {
    const model = adaptHashlineDetails({
      version: 1,
      status: "partial",
      files: [
        {
          path: "src/good.ts",
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
        {
          path: "src/bad.ts",
          operation: "unknown",
          status: "error",
          hunks: [],
          error: "EACCES",
        },
      ],
    });
    if (model === undefined) throw new Error("fixture");
    expect(text(new EditView(plainTheme(), { model }).render(70))).toMatchSnapshot();
  });

  test("TodoView", () => {
    const model: TodoViewModel = {
      mode: "serial",
      currentTaskId: "t2",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          tasks: [
            { id: "t1", content: "done", status: "completed" },
            { id: "t2", content: "current", status: "in_progress" },
            { id: "t3", content: "pending", status: "pending" },
          ],
        },
        { id: "p2", name: "Phase 2", tasks: [{ id: "t4", content: "later", status: "pending" }] },
      ],
    };
    expect(text(new TodoView(plainTheme(), { model }).render(60))).toMatchSnapshot();
  });

  test("StatusLine ANSI style sequences", () => {
    const line = new StatusLine(ansiTheme, {
      icon: "●",
      title: "hashline",
      path: "src/file.ts",
      meta: "+1 -1",
    });
    const raw = line.render(40).join("\n");
    expect(raw).toContain("\x1b[38;5;81m");
    expect(raw).toContain("\x1b[0m");
  });
});
