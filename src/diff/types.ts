export type EditStatus = "pending" | "running" | "success" | "partial" | "error" | "cancelled";
export type DiffKind = "context" | "added" | "removed" | "gap";

export interface DiffLine {
  kind: DiffKind;
  oldLine?: number;
  newLine?: number;
  content: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export type FileOperation = "create" | "update" | "delete" | "rename" | "noop" | "unknown";
export type FileEditStatus = "success" | "error" | "not_written" | "unknown";

export interface FileEditView {
  path: string;
  sourcePath?: string;
  operation: FileOperation;
  status: FileEditStatus;
  hunks: DiffHunk[];
  additions?: number;
  deletions?: number;
  truncated?: boolean;
  warnings?: string[];
  error?: string;
}

export interface EditViewModel {
  toolCallId?: string;
  status: EditStatus;
  files: FileEditView[];
  durationMs?: number;
  truncated?: boolean;
  error?: string;
}
