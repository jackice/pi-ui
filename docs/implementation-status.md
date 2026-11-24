# 实施状态

最后更新：2026-11-24

| 任务 | 状态 | 证据 | 备注 |
|---|---|---|---|
| P0-01 环境与源码锁定 | 完成 | `docs/compatibility.md` §1-4 | Bun 全局锁文件记录 1.5.2，磁盘实际 1.6.0 |
| P0-02 Edit 探针 | 完成 | 真实 Pi TUI/JSON：details=1、resolver 接管、执行保留、原生 edit 不变 | 本地 Hashline source |
| P0-02 TODO 探针 | 完成 | 真实 TUI：widget 生命周期、落盘、reload/fork/new/switch/navigate/shutdown、EACCES、共存、高度上限 | `/tree` UI 与取消路径留 P3 |
| P0-02 Approval 探针 | 未开始 | — | 需要最终参数绑定与取消路径 |
| G0-Base | 通过 | 打包产物在真实 Pi 1.6.0 中加载：`loaded rows=3 status=1 first=32` | 公开 TUI/Theme 契约已记录 |
| G0-Edit | 通过 | `docs/compatibility.md` §2.2-2.3、§3 | 本地 source 交付 `details` v1；安装版 0.1.1 仍需升级 |
| G0-Todo | 通过 | `docs/compatibility.md` §4.2 | HUD、持久化、分支替换、reload、共存、高度上限 |
| G0-Approval | 阻断 | `docs/compatibility.md` §4.3 | 现有 Gate 无队列/超时/最终绑定 |
| P1-01 Component 契约 | 完成 | `src/core/layout.ts` | 复用 `@earendil-works/pi-tui` 公开契约 |
| P1-02 Theme / Layout | 完成 | `src/core/{theme,ansi,layout}.ts` | tone 映射、DCS/OSC/CSI 清理、宽度工具 |
| P1-03 Panel / StatusLine | 完成 | `src/components/*`、`examples/gallery.ts` | 标题嵌入边框、路径中间省略、窄宽降级 |
| G1 | 通过 | `tests/unit/widths.test.ts` | 0/1/2/10/40/80/120/240 列无越界 |
| P2-01 数据契约与 Adapter | 完成 | `src/diff/{types,adapter}.ts`、Hashline `src/edit-details.ts` | version 1；未知版本返回 `undefined` |
| P2-02 CodeFrame | 完成 | `src/components/code-frame.ts` | 双侧行号、wrapping、缩进、折叠/截断提示 |
| P2-03 EditView | 完成 | `src/views/edit.ts` | 多文件、partial/error/not_written、stats |
| P2-04 Pi 集成探针 | 完成 | 真实 Pi TUI + 打包 0.2.0 | resolver 仅接管 `hashline`，`renderShell: "self"` |
| G2 | 部分通过 | 上述探针 + 49 个单测 | 尚缺可安装 Hashline 版本、A/B provider 请求等价、40-240 列真实截图矩阵 |
| P3 | 待启动 | G0-Todo 通过、G1 通过 | 下一步实现 session_todo store、TreeList/TodoView 与 HUD |
| P4 | 阻断 | G0-Approval | 未冻结接口前不实现 ApprovalView |

## 验证记录

| 命令 | 结果 |
|---|---|
| `pnpm test` | 9 个测试文件，49 个测试通过 |
| `pnpm typecheck` | 通过 |
| `pnpm build` | 生成 `dist/`，含 `./diff` 与 `./views/edit` 子路径 |
| `pnpm gallery` | 离线渲染 Edit/partial/Panel/StatusLine，40/80/120/240 列 |
| `pnpm pack` + 真实 Pi TUI | Edit 面板显示 `success · 3ms`、`+1 -1`、`- world`、`+ patched`；文件已写入 |
| Hashline `bun test` | 14 个文件 / 285 个测试通过 |
| Hashline `tsc --noEmit` | 通过 |
| Pi TUI TODO 探针 | widget aboveEditor、重绘、hide/dispose、reload、fork、EACCES、powerline 共存均符合预期 |
| Pi TUI TODO 探针 | 首条消息前 session 目录为空；首条消息后 custom entry 落盘；6 行 widget 会挤压编辑器，cap 后 3 行通过 |
| Pi TUI session 探针 | new/fork/switch/reload 均触发 session_shutdown + widget_dispose + 新 session_start；新实例 generation 重置 |
| Pi TUI rewind 探针 | navigateTree 触发 session_tree、label 落盘、被放弃分支 custom entry 不在新 branch |
| Pi TUI 高度探针 | `clamp(rows-9,1,5)`：22/24 行下 footer 布局与基线一致；12 行限制为 3 行 |

## 阻塞与决策

1. G2 仍缺“可安装的 Hashline 兼容版本”：本地 source commit `2d152f7` 已提供 details v1，但 npm 安装版仍是 `0.1.1`。发布/升级后需重跑 A/B。
2. G0-Todo：`session_todo` 工具尚未创建；项目级 `todo` 保持不变。
3. G0-Approval：现有 `permission-gate.ts` 仅覆盖 `bash`，无最终参数绑定；P4 不得在未验证入口发布美化审批。
4. 子代理模型代理 403，Phase 0 并行侦查改为主会话直接取证。
5. 性能预算（P5）尚未测量；当前只验证了功能与宽度安全。

## 复现

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm gallery
```
