import { performance } from "node:perf_hooks";

import { BashView, ReadView, WriteView, plainTheme } from "../src/index.ts";

const theme = plainTheme();

function stats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] ?? 0;
  return {
    totalMs: samples.reduce((sum, value) => sum + value, 0),
    medianMs: at(0.5),
    p95Ms: at(0.95),
    maxMs: sorted.at(-1) ?? 0,
    samples: samples.length,
  };
}

const partial: number[] = [];
let content = "";
for (let index = 1; index <= 1000; index++) {
  content += `line ${index}\n`;
  const view = new WriteView(theme, {
    model: { status: "streaming", path: "src/stress.ts", content, argsComplete: false, lineCount: index },
    expanded: false,
  });
  const start = performance.now();
  view.render(80);
  partial.push(performance.now() - start);
}

const history: number[] = [];
for (let index = 0; index < 1000; index++) {
  const view = new ReadView(theme, {
    model: {
      status: "success",
      path: `src/file-${index}.ts`,
      source: "native",
      contentKind: "code",
      lines: Array.from({ length: 40 }, (_, line) => ({ text: `const value${line} = ${line};`, number: line + 1 })),
    },
    expanded: false,
  });
  const start = performance.now();
  view.render(80);
  history.push(performance.now() - start);
}

const bashHistory: number[] = [];
for (let index = 0; index < 1000; index++) {
  const view = new BashView(theme, {
    model: { status: "success", command: `run ${index}`, output: `line 1\nline 2\nline 3` },
    expanded: false,
  });
  const start = performance.now();
  view.render(80);
  bashHistory.push(performance.now() - start);
}

console.log(JSON.stringify({
  node: process.version,
  platform: `${process.platform}/${process.arch}`,
  partialWrite: stats(partial),
  readHistory: stats(history),
  bashHistory: stats(bashHistory),
}, null, 2));
