# 性能基准（P5-03 部分）

- 日期：2026-11-24
- 机器：Darwin 25.6.0 arm64
- Node：`v25.9.0`
- Pi：`1.6.0`
- 主题：`plainTheme`（无 ANSI）
- 方法：`pnpm bench`；每项 10 次预热；记录 median / p95；无网络、无 LLM、无文件写入
- 说明：本节只记录组件级微基准；真实 Pi TUI 的冷启动、RSS 和渲染对照见下文。

## 结果

| 场景 | p95 | median | 目标 | 结果 |
|---|---:|---:|---:|---|
| CodeFrame 100 行首次 render | 0.06 ms | 0.03 ms | ≤15 ms | 通过 |
| CodeFrame 100 行缓存命中 | 0.00 ms | 0.00 ms | ≤2 ms | 通过 |
| CodeFrame 100 行 resize | 0.03 ms | 0.02 ms | ≤5 ms | 通过 |
| EditView 100 行首次 render | 0.26 ms | 0.09 ms | ≤15 ms | 通过 |
| EditView 100 行缓存命中 | 0.00 ms | 0.00 ms | ≤2 ms | 通过 |
| EditView 100 行 resize | 0.13 ms | 0.09 ms | ≤5 ms | 通过 |
| CodeFrame 1000 行首次 render | 0.20 ms | 0.11 ms | — | 记录 |
| CodeFrame 10000 行首次 render | 1.23 ms | 0.97 ms | — | 记录 |
| EditView 1000 行首次 render | 10.01 ms | 8.27 ms | — | 记录 |
| EditView 10000 行首次 render | 96.66 ms | 89.12 ms | — | 记录 |
| Panel 缓存命中 | 0.00 ms | 0.00 ms | — | 记录 |
| StatusLine 缓存命中 | 0.00 ms | 0.00 ms | — | 记录 |

## 观察

- 100 行目标场景全部显著低于预算。
- `CodeFrame` 自身在 10000 行仍为毫秒级；`EditView` 的首次 render 随行数增长明显（10000 行 P95 96.66 ms）。
- 当前 `EditView` 默认折叠 3 个 hunk / 30 行；大会话仍需关注首次渲染与 resize。
- 缓存命中稳定为 0.00 ms（按宽度缓存）。

## 空闲启动 / RSS

方法：20 个独立 Node 子进程，各自测量 `import` 前后耗时与 RSS；基线为仅导入 `@earendil-works/pi-tui`。

| 指标 | 基线 pi-tui | 加入 pi-ui | 增量 | 目标 | 结果 |
|---|---:|---:|---:|---:|---|
| import 中位数 | 33.50 ms | 36.26 ms | +2.76 ms | ≤50 ms | 通过 |
| import p95 | 36.16 ms | 40.90 ms | +4.74 ms | — | 记录 |
| RSS 中位数 | 66.5 MiB | 67.6 MiB | +1.1 MiB | ≤15 MiB | 通过 |

说明：这是模块导入开销，不是完整 Pi TUI 冷启动；未包含扩展发现、会话创建与首次渲染。

## Pi 非交互冷启动 A/B

方法：20 次独立 `pi -p -ne -e <extension> --provider nonexistent`，只替换扩展：空扩展 vs 导入 pi-ui 并渲染一个 Panel。相同配置、相同输入。

| 指标 | 空扩展 | pi-ui 扩展 | 增量 | 目标 | 结果 |
|---|---:|---:|---:|---:|---|
| 冷启动中位数 | 155 ms | 173 ms | +17 ms | ≤50 ms | 通过 |
| 冷启动 p95 | 169 ms | 215 ms | +46 ms | — | 记录 |

## 长会话 heap 趋势

Node `--expose-gc`，反复创建并丢弃 EditView/CodeFrame/Panel：

| 阶段 | heapUsed | 相对初始 |
|---|---:|---:|
| 初始 | 6.5 MiB | — |
| 100 轮 | 7.0 MiB | +0.6 MiB |
| 1000 轮 | 7.2 MiB | +0.7 MiB |
| 1000 − 100 | — | +0.1 MiB |

结论：组件对象可回收，未观察到随轮次线性增长。

## 真实 Pi TUI：启用与禁用 EditView

同一台机器、相同 Pi/Node 版本，使用独立 `xterm-256color` PTY、42 行、初始宽度 120 列、Pi `fullscreen` 与 `dark` 主题。用 `--offline --no-approve -ne --no-mcp -ns -np -nc` 和临时 `PI_CODING_AGENT_DIR` 隔离用户配置，不发送模型提示，不执行会话里的工具。

- A 保留 Pi 的默认工具文本渲染；B 导入构建后的 pi-ui，为 `hashline` 注册 `renderShell: "self"` 和 `EditView`。两组回放等价的 Pi v3 JSONL：短会话是 1 条 100 行 diff，长会话是 1000 条不同路径的结果、每条 12 行 diff；每条含相同的 `content` 和 version 1 `details`。
- 冷启动从创建 PTY 子进程计时到首帧输出尺寸标记，随后用 `ps` 读取 RSS。短会话热渲染通过 `setToolsExpanded` 交替折叠/展开，主题切换通过 `setTheme` 交替 `light`/`dark`。长会话用 `switchSession` 来回切换 10 轮，每轮在长会话按 120→80→120→100→120 列缩放；用 PTY 输出里的当前会话 diff 和宽度标记确认渲染。冷启动、热渲染与长会话实验轮次交替 AB/BA。
- 从发出命令或调整 PTY 尺寸到读到新帧标记计时。包含宿主输入分发、渲染调度和 PTY 输出，不是单卡组件调用耗时，也不含图形终端的最终绘制。

| 场景 | 样本/组 | A 中位数 / P95 | B 中位数 / P95 | 中位数增量 |
|---|---:|---:|---:|---:|
| 冷启动到首帧 | 20 | 240.4 / 252.3 ms | 252.3 / 261.9 ms | +11.9 ms（预算 ≤50 ms） |
| 空闲 RSS | 20 | 145.2 / 145.9 MiB | 152.2 / 153.1 MiB | +7.0 MiB（预算 ≤15 MiB） |
| 100 行 diff 折叠/展开 | 100 | 17.7 / 19.7 ms | 18.0 / 20.3 ms | +0.4 ms |
| 100 行 diff 主题切换 | 6 | 17.6 / 18.0 ms | 18.0 / 18.3 ms | +0.5 ms |
| 1000 条结果会话缩放 | 40 | 22.1 / 25.8 ms | 128.5 / 155.7 ms | +106.4 ms |
| 切入 1000 条结果会话 | 10 | 42.1 / 61.0 ms | 153.2 / 167.4 ms | +111.1 ms |
| 切回短会话 | 10 | 17.4 / 18.2 ms | 20.5 / 26.7 ms | +3.1 ms |

### 长会话内存与 CPU 热点

常规 A/B 在各轮动作后读取 `process.memoryUsage()`，不触发 GC。另开一组相同的会话切换与缩放，通过 `HeapProfiler.collectGarbage` 采集存活堆，避免把尚未回收的分配当成泄漏。

| 检查点 | A RSS / heapUsed | B RSS / heapUsed | A GC 后 heapUsed | B GC 后 heapUsed |
|---|---:|---:|---:|---:|
| 第 1 轮 · 长会话 | 218.0 / 78.1 MiB | 452.5 / 106.7 MiB | 48.4 MiB | 52.6 MiB |
| 第 5 轮 · 长会话 | 335.9 / 117.9 MiB | 708.5 / 241.3 MiB | 50.1 MiB | 53.3 MiB |
| 第 10 轮 · 长会话 | 334.2 / 74.7 MiB | 709.8 / 145.8 MiB | 49.4 MiB | 52.7 MiB |
| 第 1 轮 · 切回短会话 | 216.6 / 53.2 MiB | 452.7 / 119.3 MiB | 36.3 MiB | 30.8 MiB |
| 第 10 轮 · 切回短会话 | 334.2 / 86.0 MiB | 709.8 / 157.3 MiB | 36.4 MiB | 30.7 MiB |

- B 的常规 RSS 在第 5–10 轮约为 709–710 MiB；GC 后存活堆在同一会话类型内没有持续增长。10 轮结果未显示逐轮增加的 JS 对象保留，不等于排除泄漏；高 RSS 和长会话缩放延迟仍是独立的性能风险。
- B 每轮长会话切入并缩放 4 次共产生 6000 次 `EditView.render`；切回短会话后是 2 次。单独采样一组长会话的 4 次缩放，排除空闲与 Inspector 调用后约 568 ms，其中约 371 ms（65%）落在由 pi-ui `displayWidth`、`hardTruncate`、`wrap` 调用的 Pi TUI 宽度与截断函数。优先减少长会话重排时的逐行 ANSI 宽度计算，而不是放宽预算。

P5-03 已补足 EditView 的真实 PTY 对照。未测 TODO 工具 token、未做订阅计数或更长时间的内存压测；长会话开销待优化。该结果不代表 G5 通过。
