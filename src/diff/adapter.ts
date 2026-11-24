import { isRecord } from "../core/guards.js";
import type {
  DiffHunk,
  DiffKind,
  DiffLine,
  EditStatus,
  EditViewModel,
  FileEditStatus,
  FileEditView,
  FileOperation,
} from "./types.js";

export interface AdaptOptions {
  toolCallId?: string;
  durationMs?: number;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return undefined;
    out.push(item);
  }
  return out;
}

function parseStatus(value: unknown): EditStatus | undefined {
  if (value === "pending" || value === "running" || value === "success" || value === "partial" || value === "error" || value === "cancelled") {
    return value;
  }
  return undefined;
}

function parseOperation(value: unknown): FileOperation | undefined {
  if (value === "move" || value === "rename") return "rename";
  if (
    value === "create" ||
    value === "update" ||
    value === "delete" ||
    value === "noop" ||
    value === "unknown"
  ) {
    return value;
  }
  return undefined;
}

function parseFileStatus(value: unknown): FileEditStatus | undefined {
  if (value === "success" || value === "error" || value === "not_written" || value === "unknown") {
    return value;
  }
  return undefined;
}

function parseDiffKind(value: unknown): DiffKind | undefined {
  if (value === "context" || value === "added" || value === "removed" || value === "gap") {
    return value;
  }
  return undefined;
}

function parseLine(value: unknown): DiffLine | undefined {
  if (!isRecord(value)) return undefined;
  const kind = parseDiffKind(value.kind);
  const content = asString(value.content);
  if (kind === undefined || content === undefined) return undefined;

  const line: DiffLine = { kind, content };
  const oldLine = asNumber(value.oldLine);
  const newLine = asNumber(value.newLine);
  if (oldLine !== undefined) line.oldLine = oldLine;
  if (newLine !== undefined) line.newLine = newLine;
  return line;
}

function parseHunk(value: unknown): DiffHunk | undefined {
  if (!isRecord(value)) return undefined;
  const oldStart = asNumber(value.oldStart);
  const oldLines = asNumber(value.oldLines);
  const newStart = asNumber(value.newStart);
  const newLines = asNumber(value.newLines);
  if (oldStart === undefined || oldLines === undefined || newStart === undefined || newLines === undefined) {
    return undefined;
  }
  if (!Array.isArray(value.lines)) return undefined;

  const lines: DiffLine[] = [];
  for (const raw of value.lines) {
    const line = parseLine(raw);
    if (line === undefined) return undefined;
    lines.push(line);
  }
  return { oldStart, oldLines, newStart, newLines, lines };
}

function parseFile(value: unknown): FileEditView | undefined {
  if (!isRecord(value)) return undefined;
  const path = asString(value.path);
  const operation = parseOperation(value.operation);
  const status = parseFileStatus(value.status);
  if (path === undefined || operation === undefined || status === undefined) return undefined;
  if (!Array.isArray(value.hunks)) return undefined;

  const hunks: DiffHunk[] = [];
  for (const raw of value.hunks) {
    const hunk = parseHunk(raw);
    if (hunk === undefined) return undefined;
    hunks.push(hunk);
  }

  const file: FileEditView = { path, operation, status, hunks };
  const sourcePath = asString(value.sourcePath);
  if (sourcePath !== undefined) file.sourcePath = sourcePath;
  const additions = asNumber(value.additions);
  const deletions = asNumber(value.deletions);
  if (additions !== undefined) file.additions = additions;
  if (deletions !== undefined) file.deletions = deletions;
  if (value.truncated === true) file.truncated = true;
  const warnings = asStringArray(value.warnings);
  if (warnings !== undefined) file.warnings = warnings;
  const error = asString(value.error);
  if (error !== undefined) file.error = error;
  return file;
}

/**
 * 将 Hashline `details` version 1 适配为 UI 模型。
 * 未知版本或结构损坏时返回 undefined，调用方回退到原始文本 renderer。
 */
export function adaptHashlineDetails(value: unknown, options: AdaptOptions = {}): EditViewModel | undefined {
  if (!isRecord(value) || value.version !== 1) return undefined;
  const status = parseStatus(value.status);
  if (status === undefined || !Array.isArray(value.files)) return undefined;

  const files: FileEditView[] = [];
  for (const raw of value.files) {
    const file = parseFile(raw);
    if (file === undefined) return undefined;
    files.push(file);
  }

  const model: EditViewModel = { status, files };
  if (options.toolCallId !== undefined) model.toolCallId = options.toolCallId;
  if (options.durationMs !== undefined) model.durationMs = options.durationMs;
  if (value.truncated === true || files.some((file) => file.truncated === true)) model.truncated = true;
  const error = asString(value.error);
  if (error !== undefined) model.error = error;
  return model;
}
