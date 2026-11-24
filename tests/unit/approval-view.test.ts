import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.ts";
import { plainTheme } from "../../src/core/theme.ts";
import { ApprovalView, type ApprovalRequestView } from "../../src/views/approval.ts";

const request: ApprovalRequestView = {
  toolName: "bash",
  command: "rm -rf /tmp/target",
  cwd: "/tmp/work",
  reason: "destructive command",
  risk: "high",
};

const keybindings = {
  matches(data: string, binding: string) {
    return (
      (binding === "tui.select.up" && data === "\x1b[A") ||
      (binding === "tui.select.down" && data === "\x1b[B") ||
      (binding === "tui.select.confirm" && data === "\r") ||
      (binding === "tui.select.cancel" && data === "\x1b") ||
      (binding === "tui.select.pageUp" && data === "PAGEUP") ||
      (binding === "tui.select.pageDown" && data === "PAGEDOWN")
    );
  },
};

function text(lines: readonly string[]): string {
  return stripTerminalSequences(lines.join("\n"));
}

describe("ApprovalView", () => {
  it("shows command, cwd, reason and risk with Deny focused by default", () => {
    const output = text(new ApprovalView(plainTheme(), { request }).render(70));
    expect(output).toContain("Approval · bash");
    expect(output).toContain("high");
    expect(output).toContain("/tmp/work");
    expect(output).toContain("rm -rf /tmp/target");
    expect(output).toContain("destructive command");
    expect(output).toContain("Deny");
    expect(output).toContain("Allow once");
    expect(output).toMatch(/> Deny/);
  });

  it("selects allow and returns the decision on confirm", () => {
    const view = new ApprovalView(plainTheme(), { request });
    expect(view.handleInput("\x1b[A", keybindings)).toBeUndefined();
    expect(text(view.render(70))).toMatch(/> Allow once/);
    expect(view.handleInput("\r", keybindings)).toBe("allow_once");
  });

  it("returns deny on cancel and confirm", () => {
    const view = new ApprovalView(plainTheme(), { request });
    expect(view.handleInput("\x1b", keybindings)).toBe("deny");
    expect(view.handleInput("\r", keybindings)).toBe("deny");
  });

  it("scrolls long commands without truncating the stored text", () => {
    const long = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join("\n");
    const view = new ApprovalView(plainTheme(), {
      request: { ...request, command: long },
      maxCommandLines: 4,
    });
    const first = text(view.render(50));
    expect(first).toContain("line 1");
    expect(first).toContain("↓");
    view.handleInput("\x1b[6~", keybindings);
    const second = text(view.render(50));
    expect(second).toContain("↑");
    expect(second).not.toBe(first);

    view.handleInput("PAGEDOWN", keybindings);
    expect(text(view.render(50))).not.toBe(second);
  });

  it("keeps the command visible for non-finite maxCommandLines", () => {
    const output = text(
      new ApprovalView(plainTheme(), {
        request: { ...request, command: "SECRET-COMMAND" },
        maxCommandLines: Number.NaN,
      }).render(60),
    );
    expect(output).toContain("SECRET-COMMAND");
  });

  it("sanitizes control sequences", () => {
    const output = text(
      new ApprovalView(plainTheme(), {
        request: { ...request, command: "rm -rf \x1b]8;;x\x07/tmp\x1b]8;;\x07" },
      }).render(60),
    );
    expect(output).toContain("rm -rf /tmp");
    expect(output).not.toContain("\x1b");
  });

  it("never exceeds the requested width", () => {
    const view = new ApprovalView(plainTheme(), {
      request: { ...request, command: "中文".repeat(80), reason: "原因".repeat(80) },
    });
    for (const width of [0, 1, 2, 10, 40, 80, 120, 240]) {
      const lines = view.render(width);
      if (width === 0) expect(lines).toEqual([]);
      for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(width);
    }
  });
});
