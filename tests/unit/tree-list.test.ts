import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { TreeList, type TreeNode } from "../../src/components/tree-list.ts";

const nodes: TreeNode[] = [
  {
    id: "phase-a",
    label: "Phase A",
    children: [
      { id: "a1", label: "Task A1" },
      { id: "a2", label: "Task A2" },
    ],
  },
  { id: "phase-b", label: "Phase B" },
];

describe("TreeList", () => {
  it("renders nested connectors and order", () => {
    const lines = new TreeList(plainTheme(), { nodes }).render(40).map(stripTerminalSequences);
    expect(lines[0]).toContain("Phase A");
    expect(lines[1]).toContain("Task A1");
    expect(lines[2]).toContain("Task A2");
    expect(lines[3]).toContain("Phase B");
    expect(lines.join("\n")).toContain("├─");
    expect(lines.join("\n")).toContain("└─");
    expect(lines[1]?.startsWith("│")).toBe(true);
  });

  it("hides children of collapsed nodes and marks them", () => {
    const lines = new TreeList(plainTheme(), {
      nodes,
      collapsed: new Set(["phase-a"]),
    })
      .render(40)
      .map(stripTerminalSequences);
    expect(lines.join("\n")).toContain("Phase A");
    expect(lines.join("\n")).not.toContain("Task A1");
    expect(lines[0]).toContain("▸");
  });

  it("supports ASCII connectors", () => {
    const lines = new TreeList(plainTheme(), { nodes, ascii: true }).render(40).map(stripTerminalSequences);
    expect(lines.join("\n")).toContain("|-");
    expect(lines.join("\n")).toContain("`-");
    expect(lines.join("\n")).not.toContain("├");
  });

  it("truncates with an explicit marker", () => {
    const lines = new TreeList(plainTheme(), { nodes, maxLines: 2 }).render(40).map(stripTerminalSequences);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("…");
  });

  it("never exceeds the requested width", () => {
    const tree = new TreeList(plainTheme(), {
      nodes: [
        {
          id: "a",
          label: "中文节点 " + "x".repeat(80),
          children: [{ id: "b", label: "🙂".repeat(40) }],
        },
      ],
    });
    for (const width of [0, 1, 2, 3, 10, 40, 80, 120, 240]) {
      const lines = tree.render(width);
      if (width === 0) expect(lines).toEqual([]);
      for (const line of lines) {
        expect(displayWidth(line)).toBeLessThanOrEqual(width);
        expect(line).not.toContain("\n");
      }
    }
  });
});
