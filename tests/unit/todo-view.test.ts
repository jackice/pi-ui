import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import type { TodoViewModel } from "../../src/views/todo.ts";
import { TodoView } from "../../src/views/todo.ts";

function model(overrides: Partial<TodoViewModel> = {}): TodoViewModel {
  return {
    mode: "serial",
    currentTaskId: "t2",
    phases: [
      {
        id: "p1",
        name: "Phase 1",
        tasks: [
          { id: "t1", content: "Done task", status: "completed" },
          { id: "t2", content: "Current task", status: "in_progress" },
          { id: "t3", content: "Pending task", status: "pending" },
          { id: "t4", content: "Abandoned task", status: "abandoned" },
        ],
      },
      {
        id: "p2",
        name: "Phase 2",
        tasks: [{ id: "t5", content: "Next phase task", status: "pending" }],
      },
    ],
    ...overrides,
  };
}

describe("TodoView", () => {
  it("shows phase progress, task markers and the current task", () => {
    const output = new TodoView(plainTheme(), { model: model() })
      .render(80)
      .map(stripTerminalSequences)
      .join("\n");
    expect(output).toContain("Session TODO");
    expect(output).toContain("Phase 1");
    expect(output).toContain("1/4");
    expect(output).toContain("✓ Done task");
    expect(output).toContain("▸ Current task");
    expect(output).toContain("○ Pending task");
    expect(output).toContain("✗ Abandoned task");
  });

  it("collapses subsequent phases but keeps their progress", () => {
    const output = new TodoView(plainTheme(), { model: model() })
      .render(80)
      .map(stripTerminalSequences)
      .join("\n");
    expect(output).toContain("Phase 2");
    expect(output).toContain("0/1");
    expect(output).not.toContain("Next phase task");
  });

  it("expands subsequent phases on demand", () => {
    const output = new TodoView(plainTheme(), { model: model(), expanded: true })
      .render(80)
      .map(stripTerminalSequences)
      .join("\n");
    expect(output).toContain("Next phase task");
  });

  it("prioritizes active tasks and reports the hidden count", () => {
    const tasks = [
      { id: "a", content: "completed A", status: "completed" as const },
      { id: "b", content: "pending B", status: "pending" as const },
      { id: "c", content: "current C", status: "in_progress" as const },
      { id: "d", content: "pending D", status: "pending" as const },
    ];
    const output = new TodoView(plainTheme(), {
      model: {
        mode: "serial",
        currentTaskId: "c",
        phases: [{ id: "p", name: "Phase", tasks }],
      },
      maxTasks: 2,
    })
      .render(80)
      .map(stripTerminalSequences)
      .join("\n");
    expect(output).toContain("current C");
    expect(output).toContain("pending B");
    expect(output).not.toContain("completed A");
    expect(output).toContain("还有 2 个任务");
  });

  it("shows a muted empty state", () => {
    const output = new TodoView(plainTheme(), {
      model: { mode: "serial", phases: [] },
    })
      .render(60)
      .map(stripTerminalSequences)
      .join("\n");
    expect(output).toContain("暂无任务");
  });

  it("never exceeds the requested width", () => {
    const view = new TodoView(plainTheme(), {
      model: model({
        phases: [
          {
            id: "p",
            name: "很长的阶段名称 " + "x".repeat(30),
            tasks: [
              { id: "a", content: "中文任务 " + "y".repeat(60), status: "in_progress" },
              { id: "b", content: "🙂".repeat(40), status: "pending" },
            ],
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
