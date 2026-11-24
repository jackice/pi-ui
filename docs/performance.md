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

## 未覆盖

- Pi TUI 冷启动 20 次 / 热 render 100 次的 A/B。
- 1000 个工具结果、反复切换 Session/Resize 的 RSS/heap 趋势。
- 主题切换后的缓存失效成本。
- 真实 PTY 下的端到端延迟。

因此 P5-03 标记为“部分完成”，不宣称 G5。
