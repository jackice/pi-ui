import {
  adaptHashlineDetails,
  BashView,
  displayWidth,
  EditView,
  Panel,
  plainTheme,
  StatusLine,
  TodoView,
  WriteView,
  type EditViewModel,
  type Renderable,
  type TodoViewModel,
  type Tone,
  type UiTheme,
} from "../src/index.ts";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const reset = "\x1b[0m";
const codes: Record<Tone, string> = {
  text: "",
  muted: "\x1b[38;5;244m",
  accent: "\x1b[38;5;81m",
  success: "\x1b[38;5;114m",
  warning: "\x1b[38;5;221m",
  error: "\x1b[38;5;203m",
  border: "\x1b[38;5;240m",
  added: "\x1b[38;5;114m",
  removed: "\x1b[38;5;203m",
};

const demoTheme: UiTheme = useColor
  ? {
      fg: (tone, text) => (codes[tone] ? `${codes[tone]}${text}${reset}` : text),
      bold: (text) => `\x1b[1m${text}\x1b[22m`,
    }
  : plainTheme();

const theme = demoTheme;

function text(lines: readonly string[]): Renderable {
  return { render: () => lines };
}

function requireModel(model: EditViewModel | undefined): EditViewModel {
  if (model === undefined) throw new Error("invalid edit fixture");
  return model;
}

function assertWidth(lines: readonly string[], width: number, label: string): void {
  for (const line of lines) {
    if (displayWidth(line) > width) {
      throw new Error(`${label} overflowed ${width} columns: ${displayWidth(line)}`);
    }
  }
}

function show(label: string, lines: readonly string[], width: number): void {
  assertWidth(lines, width, label);
  process.stdout.write(`${theme.fg("muted", `── ${label} @ ${width} ──`)}\n`);
  process.stdout.write(`${lines.join("\n")}\n\n`);
}

const editModel = requireModel(
  adaptHashlineDetails({
    version: 1,
    status: "success",
    files: [
      {
        path: "src/app.ts",
        operation: "update",
        status: "success",
        additions: 1,
        deletions: 1,
        hunks: [
          {
            oldStart: 10,
            oldLines: 3,
            newStart: 10,
            newLines: 3,
            lines: [
              { kind: "context", oldLine: 10, newLine: 10, content: "export function run() {" },
              { kind: "removed", oldLine: 11, content: "  return oldValue;" },
              { kind: "added", newLine: 11, content: "  return newValue;" },
              { kind: "context", oldLine: 12, newLine: 12, content: "}" },
            ],
          },
        ],
      },
    ],
  }),
);

const partialModel: EditViewModel = {
  status: "partial",
  files: [
    {
      path: "src/app.ts",
      operation: "update",
      status: "success",
      additions: 2,
      deletions: 1,
      hunks: editModel.files[0]?.hunks ?? [],
    },
    {
      path: "src/broken.ts",
      operation: "unknown",
      status: "error",
      hunks: [],
      error: "disk full",
    },
  ],
};

const todoModel: TodoViewModel = {
  mode: "serial",
  currentTaskId: "t2",
  phases: [
    {
      id: "p1",
      name: "Phase 1 · UI Foundation",
      tasks: [
        { id: "t1", content: "Panel 与 StatusLine", status: "completed" },
        { id: "t2", content: "CodeFrame 与 EditView", status: "in_progress" },
        { id: "t3", content: "TreeList 与 TodoView", status: "pending" },
        { id: "t4", content: "旧方案：原生 diff 预览", status: "abandoned" },
        { id: "t5", content: "性能预算", status: "pending" },
        { id: "t6", content: "真实 Pi 截图矩阵", status: "pending" },
      ],
    },
    {
      id: "p2",
      name: "Phase 2 · Approval",
      tasks: [{ id: "t7", content: "FIFO 与最终参数绑定", status: "pending" }],
    },
    {
      id: "p3",
      name: "Phase 3 · Performance",
      tasks: [{ id: "t8", content: "100 行 diff P95", status: "pending" }],
    },
    {
      id: "p4",
      name: "Phase 4 · Release",
      tasks: [{ id: "t9", content: "Gallery 与 changelog", status: "pending" }],
    },
    {
      id: "p5",
      name: "Phase 5 · Post-release",
      tasks: [{ id: "t10", content: "后续需求", status: "pending" }],
    },
  ],
};

const approvalBody = text([
  theme.fg("muted", "cwd  /Users/jackice/dev/src/github.com/jackice/pi-ui"),
  theme.fg("muted", "风险 high · 需要一次批准"),
  "",
  theme.fg("text", "  $ rm -rf node_modules && pnpm install"),
  "",
  theme.fg("muted", "↑/↓ 选择 · Enter 确认 · Esc 拒绝"),
]);

function gallery(width: number): void {
  const edit = new EditView(theme, { model: editModel, maxHunks: 3 });
  show("Edit view fixture", edit.render(width), width);

  const partial = new EditView(theme, { model: partialModel, expanded: true });
  show("Edit partial fixture", partial.render(width), width);

  const bash = new BashView(theme, {
    model: {
      status: "success",
      command: "pnpm test",
      output: Array.from({ length: 20 }, (_, index) => `row ${index + 1}`).join("\n"),
      durationMs: 2800,
    },
    expanded: false,
  });
  show("Bash view fixture", bash.render(width), width);

  const write = new WriteView(theme, {
    model: { status: 'success', path: 'src/app.ts', content: Array.from({ length: 8 }, (_, index) => `line ${index + 1}`).join('\n'), argsComplete: true, lineCount: 8 },
    expanded: false,
  });
  show("Write view fixture", write.render(width), width);

  const todo = new TodoView(theme, { model: todoModel, maxLines: 14 });
  show("TODO HUD fixture", todo.render(width), width);

  const approval = new Panel(theme, {
    title: "Approval · bash",
    titleRight: "high risk",
    tone: "warning",
    border: "square",
    paddingX: 1,
    children: [approvalBody],
  });
  show("Approval fixture", approval.render(width), width);

  show(
    "StatusLine · normal",
    new StatusLine(theme, {
      icon: "●",
      title: "hashline",
      path: "src/components/panel.ts",
      meta: "+2 -1",
    }).render(width),
    width,
  );

  show(
    "StatusLine · long path + unicode",
    new StatusLine(theme, {
      icon: "◆",
      title: "running 中文任务",
      path: "/Users/jackice/dev/src/github.com/jackice/项目/文件.ts",
      meta: "12%",
      tone: "accent",
    }).render(width),
    width,
  );
}

process.stdout.write(`${theme.bold("pi-ui gallery")} ${theme.fg("muted", "· offline · no LLM · no file writes")}\n\n`);
for (const width of [40, 80, 120, 240]) gallery(width);
