# 性能基准（P5-03 部分）

- 日期：2026-11-24
- 机器：Darwin 25.6.0 arm64
- Node：`v25.9.0`
- Pi：`1.6.0`
- 主题：`plainTheme`（无 ANSI）
- 方法：`pnpm bench`；每项 10 次预热；记录 median / p95；无网络、无 LLM、无文件写入
- 说明：这是组件级微基准，不是完整 P5 验收；冷启动、RSS、A/B 交替尚未测量

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
- `CodeFrame` 自身在 10000 行仍为毫秒级；`EditView` 的首次 render 随行数增长明显（10000 行约 97 ms），主要成本来自视图组合与每行处理，Ui 折叠并未完全摊薄。
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

## 完整 Pi 冷启动 A/B

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

## 未覆盖

- 真实 Pi TUI 会话 1000 个工具结果、反复 switch/resize 的 RSS 趋势。
- 主题切换后的缓存失效成本。
- 真实 PTY 下的端到端渲染延迟。
- hot render A/B（已测组件级缓存，未在宿主内交替启用/禁用 UI）。

因此 P5-03 标记为“部分完成”，不宣称 G5。
