import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-ui-coldstart-"));
const noop = path.join(dir, "noop.ts");
const ui = path.join(dir, "ui.ts");
const uiUrl = pathToFileURL(`${root}/dist/index.js`).href;

fs.writeFileSync(
  noop,
  `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";\nexport default function (_pi: ExtensionAPI): void {}\n`,
);
fs.writeFileSync(
  ui,
  `import { Panel, plainTheme } from ${JSON.stringify(uiUrl)};\nimport type { ExtensionAPI } from "@earendil-works/pi-coding-agent";\nexport default function (_pi: ExtensionAPI): void {\n  const lines = new Panel(plainTheme(), { title: "cold", children: [{ render: () => ["body"] }] }).render(40);\n  void lines;\n}\n`,
);

function run(extension, runs) {
  const samples = [];
  for (let index = 0; index < runs; index++) {
    const start = performance.now();
    const result = spawnSync(
      "pi",
      [
        "-p",
        "--no-session",
        "-ne",
        "-e",
        extension,
        "--provider",
        "nonexistent",
        "--model",
        "nonexistent",
        "x",
      ],
      { cwd: dir, encoding: "utf8", timeout: 30_000 },
    );
    samples.push(performance.now() - start);
    if (result.error) throw result.error;
  }
  samples.sort((a, b) => a - b);
  const at = (quantile) => samples[Math.min(samples.length - 1, Math.ceil(quantile * samples.length) - 1)];
  return { median: at(0.5), p95: at(0.95) };
}

const runs = 20;
const base = run(noop, runs);
const withUi = run(ui, runs);
console.log(`Node ${process.version}, pi ${process.env.PI_VERSION ?? ""}, runs=${runs}`);
console.log(`no-op extension: median=${base.median.toFixed(0)}ms p95=${base.p95.toFixed(0)}ms`);
console.log(`pi-ui extension: median=${withUi.median.toFixed(0)}ms p95=${withUi.p95.toFixed(0)}ms`);
console.log(`delta:           ${(withUi.median - base.median).toFixed(0)}ms (median)`);
fs.rmSync(dir, { recursive: true, force: true });
