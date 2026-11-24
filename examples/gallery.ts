import {
  adaptHashlineDetails,
  displayWidth,
  EditView,
  Panel,
  plainTheme,
  StatusLine,
  type EditViewModel,
  type Renderable,
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

const todoBody = text([
  theme.fg("accent", "▾ Phase 1 · UI Foundation"),
  theme.fg("success", "  ✓ Panel 与 StatusLine"),
  theme.fg("warning", "  ▸ CodeFrame（P2 门禁未开）"),
  theme.fg("muted", "  ○ TreeList（P3 门禁未开）"),
]);

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

  const todo = new Panel(theme, {
    title: "Session TODO",
    titleRight: "2/4",
    border: "rounded",
    paddingX: 1,
    children: [todoBody],
  });
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
