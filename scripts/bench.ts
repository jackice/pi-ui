import { performance } from "node:perf_hooks";

import {
  CodeFrame,
  EditView,
  Panel,
  plainTheme,
  StatusLine,
  type DiffHunk,
  type EditViewModel,
} from "../src/index.ts";

interface Stats {
  median: number;
  p95: number;
  min: number;
  max: number;
  samples: number;
}

function measure(iterations: number, fn: () => void): Stats {
  for (let index = 0; index < Math.min(10, iterations); index++) fn();
  const samples: number[] = [];
  for (let index = 0; index < iterations; index++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const at = (quantile: number) => samples[Math.min(samples.length - 1, Math.ceil(quantile * samples.length) - 1)] ?? 0;
  return {
    median: at(0.5),
    p95: at(0.95),
    min: samples[0] ?? 0,
    max: samples[samples.length - 1] ?? 0,
    samples: samples.length,
  };
}

function makeHunk(lineCount: number): DiffHunk {
  const lines = Array.from({ length: lineCount }, (_, index) => {
    const line = index + 1;
    const content = `line ${line} ${"x".repeat(index % 40)}`;
    if (index % 3 === 0) return { kind: "removed" as const, oldLine: line, content };
    if (index % 3 === 1) return { kind: "added" as const, newLine: line, content: content + " +" };
    return { kind: "context" as const, oldLine: line, newLine: line, content };
  });
  const olds = lines.flatMap((line) => ("oldLine" in line ? [line.oldLine] : []));
  const news = lines.flatMap((line) => ("newLine" in line ? [line.newLine] : []));
  return {
    oldStart: olds[0] ?? 0,
    oldLines: olds.length,
    newStart: news[0] ?? 0,
    newLines: news.length,
    lines,
  };
}

function makeModel(lineCount: number): EditViewModel {
  return {
    status: "success",
    files: [
      {
        path: "src/perf.ts",
        operation: "update",
        status: "success",
        additions: Math.ceil(lineCount / 3),
        deletions: Math.floor(lineCount / 3),
        hunks: [makeHunk(lineCount)],
      },
    ],
  };
}

function row(name: string, stats: Stats, target?: number): string {
  const value = `${stats.p95.toFixed(2)} ms`;
  const verdict = target === undefined ? "" : stats.p95 <= target ? " ✓" : " ✗";
  return `${name.padEnd(42)} p95=${value.padStart(10)} median=${stats.median.toFixed(2).padStart(8)} ms${verdict}`;
}

const theme = plainTheme();
const hunks100 = [makeHunk(100)];
const model100 = makeModel(100);
const model1000 = makeModel(1000);
const model10000 = makeModel(10000);

const first100 = measure(100, () => {
  new CodeFrame(theme, { hunks: hunks100 }).render(120);
});

const cachedFrame = new CodeFrame(theme, { hunks: hunks100 });
cachedFrame.render(120);
const cached = measure(2000, () => {
  cachedFrame.render(120);
});

let resizeWidth = 120;
const resized = measure(500, () => {
  resizeWidth = resizeWidth === 120 ? 121 : 120;
  cachedFrame.render(resizeWidth);
});

const viewFirst100 = measure(100, () => {
  new EditView(theme, { model: model100, expanded: true }).render(120);
});

const cachedView = new EditView(theme, { model: model100, expanded: true });
cachedView.render(120);
const viewCached = measure(1000, () => {
  cachedView.render(120);
});

let viewWidth = 120;
const viewResize = measure(300, () => {
  viewWidth = viewWidth === 120 ? 121 : 120;
  cachedView.render(viewWidth);
});

const frame1000 = measure(50, () => {
  new CodeFrame(theme, { hunks: [makeHunk(1000)] }).render(120);
});
const frame10000 = measure(10, () => {
  new CodeFrame(theme, { hunks: [makeHunk(10000)] }).render(120);
});
const view1000 = measure(20, () => {
  new EditView(theme, { model: model1000, expanded: true }).render(120);
});
const view10000 = measure(5, () => {
  new EditView(theme, { model: model10000, expanded: true }).render(120);
});

const panel = new Panel(theme, { title: "Panel", children: [{ render: () => ["body"] }] });
const panelStats = measure(2000, () => {
  panel.render(80);
});
const status = new StatusLine(theme, { icon: "●", title: "hashline", path: "src/file.ts", meta: "+1 -1" });
const statusStats = measure(5000, () => {
  status.render(80);
});

console.log(`Node ${process.version} ${process.platform}/${process.arch}`);
console.log(row("CodeFrame 100-line first render", first100, 15));
console.log(row("CodeFrame 100-line cache hit", cached, 2));
console.log(row("CodeFrame 100-line resize", resized, 5));
console.log(row("EditView 100-line first render", viewFirst100, 15));
console.log(row("EditView 100-line cache hit", viewCached, 2));
console.log(row("EditView 100-line resize", viewResize, 5));
console.log(row("CodeFrame 1000-line first render", frame1000));
console.log(row("CodeFrame 10000-line first render", frame10000));
console.log(row("EditView 1000-line first render", view1000));
console.log(row("EditView 10000-line first render", view10000));
console.log(row("Panel cache hit", panelStats));
console.log(row("StatusLine cache hit", statusStats));
