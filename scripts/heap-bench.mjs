import { pathToFileURL } from "node:url";

const root = process.cwd();
const ui = await import(pathToFileURL(`${root}/dist/index.js`).href);
const { EditView, CodeFrame, Panel, plainTheme } = ui;

function collect() {
  if (global.gc) global.gc();
  return process.memoryUsage();
}

function mib(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

const hunk = {
  oldStart: 1,
  oldLines: 100,
  newStart: 1,
  newLines: 100,
  lines: Array.from({ length: 100 }, (_, index) => ({
    kind: index % 2 === 0 ? "removed" : "added",
    oldLine: index + 1,
    newLine: index + 1,
    content: `line ${index + 1}`,
  })),
};
const model = {
  status: "success",
  files: [
    {
      path: "src/heap.ts",
      operation: "update",
      status: "success",
      additions: 50,
      deletions: 50,
      hunks: [hunk],
    },
  ],
};
const theme = plainTheme();

const before = collect();
for (let index = 0; index < 100; index++) {
  new EditView(theme, { model, expanded: true }).render(120);
  new CodeFrame(theme, { hunks: [hunk] }).render(120);
  new Panel(theme, { title: "x", children: [{ render: () => ["body"] }] }).render(80);
}
const after100 = collect();
for (let index = 0; index < 900; index++) {
  new EditView(theme, { model, expanded: true }).render(120);
  new CodeFrame(theme, { hunks: [hunk] }).render(120);
  new Panel(theme, { title: "x", children: [{ render: () => ["body"] }] }).render(80);
}
const after1000 = collect();

console.log(`Node ${process.version} ${process.platform}/${process.arch}`);
console.log(`heap before:        ${mib(before.heapUsed)} MiB (rss ${mib(before.rss)} MiB)`);
console.log(`heap after 100:     ${mib(after100.heapUsed)} MiB (delta ${mib(after100.heapUsed - before.heapUsed)} MiB)`);
console.log(`heap after 1000:    ${mib(after1000.heapUsed)} MiB (delta ${mib(after1000.heapUsed - before.heapUsed)} MiB)`);
console.log(`1000 - 100 growth:  ${mib(after1000.heapUsed - after100.heapUsed)} MiB`);
