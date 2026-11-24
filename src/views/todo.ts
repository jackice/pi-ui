import { sanitizeLine } from "../core/ansi.js";
import type { Renderable } from "../core/layout.js";
import type { UiTheme } from "../core/theme.js";
import { Panel } from "../components/panel.js";
import { TreeList, type TreeNode } from "../components/tree-list.js";

export type TodoTaskStatus = "pending" | "in_progress" | "completed" | "abandoned";

export interface TodoTaskView {
  id: string;
  content: string;
  status: TodoTaskStatus;
  assignee?: string;
}

export interface TodoPhaseView {
  id: string;
  name: string;
  tasks: readonly TodoTaskView[];
}

export interface TodoViewModel {
  title?: string;
  mode: "serial" | "parallel";
  phases: readonly TodoPhaseView[];
  currentTaskId?: string;
}

export interface TodoViewProps {
  model: TodoViewModel;
  expanded?: boolean;
  maxPhases?: number;
  maxTasks?: number;
  maxLines?: number;
  title?: string;
}

const DEFAULTS = { maxPhases: 4, maxTasks: 5, maxLines: 8 } as const;

export class TodoView {
  private props: TodoViewProps;
  private theme: UiTheme;
  private panel: Panel;

  constructor(theme: UiTheme, props: TodoViewProps) {
    this.theme = theme;
    this.props = props;
    this.panel = this.buildPanel();
  }

  setProps(props: Partial<TodoViewProps>): void {
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
    const model = this.props.model;
    const expanded = this.props.expanded === true;
    const maxPhases = positive(this.props.maxPhases, DEFAULTS.maxPhases);
    const maxTasks = positive(this.props.maxTasks, DEFAULTS.maxTasks);
    const maxLines = positive(this.props.maxLines, DEFAULTS.maxLines);
    const currentPhase = currentPhaseIndex(model);
    const start = expanded ? 0 : Math.max(0, currentPhase);
    const end = expanded ? model.phases.length : Math.min(model.phases.length, start + maxPhases);
    const visible = model.phases.slice(start, end);
    const collapsed = new Set<string>();

    if (!expanded) {
      model.phases.forEach((phase, index) => {
        if (index !== currentPhase) collapsed.add(phase.id);
      });
    }

    const nodes: TreeNode[] = [];
    if (!expanded && start > 0) {
      nodes.push({ id: "__earlier_phases", label: this.theme.fg("muted", `… 还有 ${start} 个阶段`) });
    }

    for (const phase of visible) {
      const isCurrent = phase.id === model.phases[currentPhase]?.id;
      const done = phase.tasks.filter((task) => task.status === "completed").length;
      const total = phase.tasks.length;
      const label = this.phaseLabel(phase, done, total, isCurrent);
      const selected = expanded || isCurrent ? selectTasks(phase.tasks, maxTasks, model.currentTaskId) : { tasks: phase.tasks, hidden: 0 };
      const children: TreeNode[] = selected.tasks.map((task) => ({
        id: task.id,
        label: this.taskLabel(task, task.id === model.currentTaskId),
      }));
      if (selected.hidden > 0) {
        children.push({
          id: `${phase.id}__more_tasks`,
          label: this.theme.fg("muted", `… 还有 ${selected.hidden} 个任务`),
        });
      }
      nodes.push({ id: phase.id, label, children });
    }

    const hiddenPhases = Math.max(0, model.phases.length - visible.length);
    if (!expanded && hiddenPhases > 0) {
      nodes.push({ id: "__more_phases", label: this.theme.fg("muted", `… 还有 ${hiddenPhases} 个阶段`) });
    }

    const allTasks = model.phases.flatMap((phase) => phase.tasks);
    const allDone = allTasks.filter((task) => task.status === "completed").length;
    const titleRight = allTasks.length === 0 ? "empty" : `${allDone}/${allTasks.length}`;
    const children: Renderable[] =
      nodes.length === 0
        ? [{ render: () => [this.theme.fg("muted", "暂无任务")] }]
        : [new TreeList(this.theme, { nodes, collapsed, maxLines })];

    return new Panel(this.theme, {
      title: this.props.title ?? model.title ?? "Session TODO",
      titleRight,
      tone: allTasks.length > 0 && allDone === allTasks.length ? "success" : "accent",
      border: "rounded",
      paddingX: 1,
      children,
    });
  }

  private phaseLabel(phase: TodoPhaseView, done: number, total: number, current: boolean): string {
    const text = `${phase.name}  ${done}/${total}`;
    if (current) return this.theme.bold(this.theme.fg("accent", text));
    if (total > 0 && done === total) return this.theme.fg("success", text);
    return this.theme.fg("text", text);
  }

  private taskLabel(task: TodoTaskView, current: boolean): string {
    const content = sanitizeLine(task.content);
    switch (task.status) {
      case "completed":
        return this.theme.fg("success", `✓ ${content}`);
      case "in_progress":
        return this.theme.bold(this.theme.fg("accent", `▸ ${content}`));
      case "abandoned":
        return this.theme.fg("muted", `✗ ${content}`);
      case "pending":
        return current
          ? this.theme.bold(this.theme.fg("accent", `▸ ${content}`))
          : this.theme.fg("muted", `○ ${content}`);
    }
  }
}

function currentPhaseIndex(model: TodoViewModel): number {
  const active = model.phases.findIndex((phase) =>
    phase.tasks.some((task) => task.status === "in_progress" || task.id === model.currentTaskId),
  );
  if (active >= 0) return active;
  const pending = model.phases.findIndex((phase) =>
    phase.tasks.some((task) => task.status === "pending" || task.status === "abandoned"),
  );
  if (pending >= 0) return pending;
  return Math.max(0, model.phases.length - 1);
}

function selectTasks(
  tasks: readonly TodoTaskView[],
  limit: number,
  currentTaskId: string | undefined,
): { tasks: readonly TodoTaskView[]; hidden: number } {
  if (tasks.length <= limit) return { tasks, hidden: 0 };
  const active = tasks.filter((task) => task.status === "in_progress" || task.id === currentTaskId);
  const pending = tasks.filter((task) => task.status === "pending" && task.id !== currentTaskId);
  const rest = tasks.filter(
    (task) => task.status !== "in_progress" && task.status !== "pending" && task.id !== currentTaskId,
  );
  return { tasks: [...active, ...pending, ...rest].slice(0, limit), hidden: tasks.length - limit };
}

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}
