import { sanitizeLine, wrap } from "../core/ansi.js";
import type { Renderable } from "../core/layout.js";
import type { Tone, UiTheme } from "../core/theme.js";
import { CodeFrame } from "../components/code-frame.js";
import { Panel } from "../components/panel.js";
import { StatusLine } from "../components/status-line.js";
import type { EditStatus, EditViewModel, FileEditStatus, FileEditView, FileOperation } from "../diff/types.js";

export interface EditViewProps {
  model: EditViewModel;
  expanded?: boolean;
  maxFiles?: number;
  title?: string;
  maxHunks?: number;
  maxLines?: number;
}

interface StatusMeta {
  label: string;
  tone: Tone;
  icon: string;
}

const DEFAULT_MAX_FILES = 3;

export class EditView {
  private props: EditViewProps;
  private theme: UiTheme;
  private panel: Panel;

  constructor(theme: UiTheme, props: EditViewProps) {
    this.theme = theme;
    this.props = props;
    this.panel = this.buildPanel();
  }

  setProps(props: Partial<EditViewProps>): void {
    this.props = { ...this.props, ...props };
    this.panel = this.buildPanel();
  }

  setTheme(theme: UiTheme): void {
    this.theme = theme;
    this.panel = this.buildPanel();
  }

  invalidate(): void {
    this.panel.invalidate();
  }

  render(width: number): readonly string[] {
    return this.panel.render(width);
  }

  private buildPanel(): Panel {
    const status = statusMeta(this.props.model.status);
    const rightParts = [status.label];
    if (this.props.model.durationMs !== undefined) rightParts.push(`${this.props.model.durationMs}ms`);

    return new Panel(this.theme, {
      title: this.props.title ?? "Edit",
      titleRight: rightParts.join(" · "),
      tone: status.tone,
      border: "rounded",
      paddingX: 1,
      children: this.buildChildren(),
    });
  }

  private buildChildren(): Renderable[] {
    const model = this.props.model;
    const expanded = this.props.expanded === true;
    const maxFiles = positive(this.props.maxFiles, DEFAULT_MAX_FILES);
    const visibleFiles = expanded ? model.files : model.files.slice(0, maxFiles);
    const hiddenFiles = Math.max(0, model.files.length - visibleFiles.length);
    const children: Renderable[] = [];

    if (visibleFiles.length === 0) {
      const message = model.error ?? "no file changes";
      children.push(textBlock(this.theme, message, model.error === undefined ? "muted" : "error"));
      return children;
    }

    visibleFiles.forEach((file, index) => {
      if (index > 0) children.push(SPACER);
      children.push(this.fileStatusLine(file));

      if (file.error !== undefined) {
        children.push(textBlock(this.theme, file.error, "error"));
      }
      if (expanded && file.warnings !== undefined) {
        for (const warning of file.warnings) children.push(textBlock(this.theme, warning, "muted"));
      }
      if (file.hunks.length > 0) {
        children.push(
          new CodeFrame(this.theme, {
            hunks: file.hunks,
            expanded,
            sourceTruncated: file.truncated === true,
            indentGuides: true,
            ...(this.props.maxHunks === undefined ? {} : { maxHunks: this.props.maxHunks }),
            ...(this.props.maxLines === undefined ? {} : { maxLines: this.props.maxLines }),
          }),
        );
      }
    });

    if (hiddenFiles > 0) {
      children.push(SPACER, textBlock(this.theme, `还有 ${hiddenFiles} 个文件`, "muted"));
    }
    if (model.error !== undefined) {
      children.push(textBlock(this.theme, model.error, "error"));
    }
    return children;
  }

  private fileStatusLine(file: FileEditView): StatusLine {
    const meta = fileMeta(file);
    return new StatusLine(this.theme, {
      icon: fileIcon(file.status),
      title: `${operationLabel(file.operation)} ${basename(file.path)}`,
      path: file.sourcePath === undefined ? file.path : `${file.sourcePath} → ${file.path}`,
      meta,
      iconTone: fileTone(file.status),
      pathTone: "muted",
      metaTone: "muted",
    });
  }
}

const SPACER: Renderable = { render: () => [""] };

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function statusMeta(status: EditStatus): StatusMeta {
  switch (status) {
    case "success":
      return { label: "success", tone: "success", icon: "✓" };
    case "partial":
      return { label: "partial", tone: "warning", icon: "!" };
    case "error":
      return { label: "error", tone: "error", icon: "✗" };
    case "cancelled":
      return { label: "cancelled", tone: "muted", icon: "⊘" };
    case "running":
      return { label: "running", tone: "accent", icon: "◐" };
    case "pending":
      return { label: "pending", tone: "muted", icon: "○" };
  }
}

function fileIcon(status: FileEditStatus): string {
  switch (status) {
    case "success":
      return "✓";
    case "error":
      return "✗";
    case "not_written":
      return "○";
    case "unknown":
      return "·";
  }
}

function fileTone(status: FileEditStatus): Tone {
  switch (status) {
    case "success":
      return "success";
    case "error":
      return "error";
    case "not_written":
      return "warning";
    case "unknown":
      return "muted";
  }
}

function operationLabel(operation: FileOperation): string {
  switch (operation) {
    case "create":
      return "create";
    case "update":
      return "update";
    case "delete":
      return "delete";
    case "rename":
      return "rename";
    case "noop":
      return "noop";
    case "unknown":
      return "edit";
  }
}

function fileMeta(file: FileEditView): string {
  if (file.status === "not_written") return "not written";
  if (file.status === "error" && file.additions === undefined && file.deletions === undefined) return "error";
  if (file.operation === "noop") return "no changes";
  if (file.additions !== undefined || file.deletions !== undefined) {
    return `+${file.additions ?? 0} -${file.deletions ?? 0}`;
  }
  return "";
}

function basename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? path;
}

function textBlock(theme: UiTheme, text: string, tone: Tone): Renderable {
  return {
    render: (width: number) => {
      const lines: string[] = [];
      for (const raw of text.split("\n")) {
        for (const line of wrap(sanitizeLine(raw), width)) {
          lines.push(theme.fg(tone, line));
        }
      }
      return lines;
    },
  };
}
