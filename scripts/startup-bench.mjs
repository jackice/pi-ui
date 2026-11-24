import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const cwd = process.cwd();
const uiUrl = pathToFileURL(`${cwd}/dist/index.js`).href;
const baseUrl = pathToFileURL(`${cwd}/node_modules/@earendil-works/pi-tui/dist/index.js`).href;

function measure(importStatement, runs) {
  const samples = [];
  for (let index = 0; index < runs; index++) {
    const code = `const t=performance.now(); ${importStatement}; console.log(JSON.stringify({ms:performance.now()-t,rss:process.memoryUsage().rss}));`;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
      cwd,
      encoding: "utf8",
      timeout: 30_000,
    });
    if (result.status !== 0) throw new Error(`child failed: ${result.stderr}`);
    const line = result.stdout.trim().split("\n").at(-1) ?? "{}";
    samples.push(JSON.parse(line));
  }
  samples.sort((a, b) => a.ms - b.ms);
  const at = (quantile) => samples[Math.min(samples.length - 1, Math.ceil(quantile * samples.length) - 1)];
  const rss = samples.map((sample) => sample.rss).sort((a, b) => a - b);
  return {
    medianMs: at(0.5).ms,
    p95Ms: at(0.95).ms,
    medianRss: rss[Math.floor(rss.length / 2)],
    p95Rss: rss[Math.min(rss.length - 1, Math.ceil(0.95 * rss.length) - 1)],
  };
}

const runs = 20;
const base = measure(`await import(${JSON.stringify(baseUrl)})`, runs);
const ui = measure(`await import(${JSON.stringify(uiUrl)})`, runs);
const deltaMs = ui.medianMs - base.medianMs;
const deltaRss = (ui.medianRss - base.medianRss) / (1024 * 1024);

console.log(`Node ${process.version} ${process.platform}/${process.arch}, runs=${runs}`);
console.log(
  `import pi-tui:       median=${base.medianMs.toFixed(2)}ms p95=${base.p95Ms.toFixed(2)}ms rss=${(base.medianRss / 1024 / 1024).toFixed(1)}MiB`,
);
console.log(
  `import pi-ui:        median=${ui.medianMs.toFixed(2)}ms p95=${ui.p95Ms.toFixed(2)}ms rss=${(ui.medianRss / 1024 / 1024).toFixed(1)}MiB`,
);
console.log(`delta median:        ${deltaMs.toFixed(2)}ms, ${deltaRss.toFixed(1)}MiB RSS`);
