import { normalizeWidth, truncate } from "../core/ansi.js";
import type { UiTheme } from "../core/theme.js";

export interface TreeNode {
  id: string;
  label: string;
  children?: readonly TreeNode[];
}

export interface TreeListProps {
  nodes: readonly TreeNode[];
  collapsed?: ReadonlySet<string>;
  ascii?: boolean;
  maxLines?: number;
}

const EMPTY_LINES: readonly string[] = [];

export class TreeList {
  private props: TreeListProps;
  private theme: UiTheme;
  private revision = 0;
  private cache: { width: number; revision: number; lines: readonly string[] } | undefined;

  constructor(theme: UiTheme, props: TreeListProps) {
    this.theme = theme;
    this.props = props;
  }

  setProps(props: Partial<TreeListProps>): void {
    this.props = { ...this.props, ...props };
    this.invalidate();
  }

  setTheme(theme: UiTheme): void {
    this.theme = theme;
    this.invalidate();
  }

  invalidate(): void {
    this.revision++;
    this.cache = undefined;
  }

  render(width: number): readonly string[] {
    const limit = normalizeWidth(width);
    if (limit === 0) return EMPTY_LINES;
    if (this.cache && this.cache.width === limit && this.cache.revision === this.revision) {
      return this.cache.lines;
    }
    const lines = this.build(limit);
    this.cache = { width: limit, revision: this.revision, lines };
    return lines;
  }

  private build(width: number): readonly string[] {
    const ascii = this.props.ascii === true;
    const collapsed = this.props.collapsed ?? new Set<string>();
    const maxLines = positive(this.props.maxLines, Number.POSITIVE_INFINITY);
    const lines: string[] = [];
    let overflow = false;

    const push = (line: string): void => {
      if (lines.length < maxLines) {
        lines.push(truncate(line, width));
        return;
      }
      overflow = true;
    };

    const walk = (nodes: readonly TreeNode[], ancestors: readonly boolean[]): void => {
      nodes.forEach((node, index) => {
        if (overflow) return;
        const isLast = index === nodes.length - 1;
        const connector = ascii ? (isLast ? "`- " : "|- ") : isLast ? "└─ " : "├─ ";
        const pipe = ascii ? "|  " : "│  ";
        const indent = ancestors.map((last) => (last ? "   " : pipe)).join("");
        const hasChildren = node.children !== undefined && node.children.length > 0;
        const isCollapsed = collapsed.has(node.id);
        const marker = hasChildren
          ? isCollapsed
            ? ascii
              ? "> "
              : "▸ "
            : ascii
              ? "v "
              : "▾ "
          : "  ";
        push(this.theme.fg("border", indent + connector) + this.theme.fg("muted", marker) + node.label);
        if (hasChildren && !isCollapsed && node.children !== undefined) {
          walk(node.children, [...ancestors, isLast]);
        }
      });
    };

    walk(this.props.nodes, []);

    if (overflow && lines.length > 0) {
      lines[lines.length - 1] = truncate(this.theme.fg("muted", "…"), width);
    }
    return lines;
  }
}

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}
