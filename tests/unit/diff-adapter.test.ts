import { describe, expect, it } from "vitest";

import { adaptHashlineDetails } from "../../src/diff/adapter.ts";

const details = {
  version: 1,
  status: "success",
  files: [
    {
      path: "src/b.ts",
      sourcePath: "src/a.ts",
      operation: "move",
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
};

describe("adaptHashlineDetails", () => {
  it("maps version 1 details to the UI model", () => {
    const model = adaptHashlineDetails(details, { toolCallId: "call-1", durationMs: 12 });
    expect(model).toBeDefined();
    expect(model?.toolCallId).toBe("call-1");
    expect(model?.durationMs).toBe(12);
    expect(model?.status).toBe("success");
    const file = model?.files[0];
    expect(file?.operation).toBe("rename");
    expect(file?.path).toBe("src/b.ts");
    expect(file?.sourcePath).toBe("src/a.ts");
    expect(file?.status).toBe("success");
    expect(file?.additions).toBe(1);
    expect(file?.deletions).toBe(1);
    expect(file?.hunks[0]?.lines).toEqual([
      { kind: "removed", oldLine: 1, content: "old" },
      { kind: "added", newLine: 1, content: "new" },
    ]);
  });

  it("maps partial and not-written states", () => {
    const model = adaptHashlineDetails({
      version: 1,
      status: "partial",
      files: [
        { path: "a.ts", operation: "update", status: "success", hunks: [], additions: 1, deletions: 0 },
        { path: "b.ts", operation: "unknown", status: "error", hunks: [], additions: 0, deletions: 0, error: "boom" },
        { path: "c.ts", operation: "unknown", status: "not_written", hunks: [], additions: 0, deletions: 0 },
      ],
    });
    expect(model?.status).toBe("partial");
    expect(model?.files.map((file) => file.status)).toEqual(["success", "error", "not_written"]);
    expect(model?.files[1]?.error).toBe("boom");
  });

  it("rejects unknown versions and malformed payloads", () => {
    expect(adaptHashlineDetails({ ...details, version: 2 })).toBeUndefined();
    expect(adaptHashlineDetails(null)).toBeUndefined();
    expect(adaptHashlineDetails({ version: 1, status: "success", files: [{ path: 1 }] })).toBeUndefined();
    expect(adaptHashlineDetails({ version: 1, status: "success", files: [{ path: "a", operation: "update", status: "success", hunks: [{ lines: "x" }] }] })).toBeUndefined();
  });

  it("keeps source truncation and warnings", () => {
    const model = adaptHashlineDetails({
      version: 1,
      status: "success",
      truncated: true,
      files: [
        {
          path: "a.ts",
          operation: "update",
          status: "success",
          hunks: [],
          additions: 100,
          deletions: 100,
          truncated: true,
          warnings: ["w"],
        },
      ],
    });
    expect(model?.truncated).toBe(true);
    expect(model?.files[0]?.truncated).toBe(true);
    expect(model?.files[0]?.warnings).toEqual(["w"]);
  });
});
