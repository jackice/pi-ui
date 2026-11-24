# 实施状态

最后更新：2026-11-24

| 任务 | 状态 | 证据 | 备注 |
|---|---|---|---|
| P0-01 环境与源码锁定 | 完成 | `docs/compatibility.md` §1-4 | Bun 全局锁文件记录 1.5.2，磁盘实际 1.6.0 |
| P0-02 Edit 探针 | 完成 | 真实 Pi TUI/JSON：details=1、resolver 接管、执行保留、原生 edit 不变 | 本地 Hashline source |
| P0-02 TODO 探针 | 完成 | 真实 TUI：widget 生命周期、落盘、reload/fork/new/switch/navigate/shutdown、EACCES、共存、高度上限 | `/tree` UI 与取消路径留 P3 |
| P0-02 Approval 探针 | 完成（阻断） | `docs/approval-findings.md`：custom<T> 行为、reload 不结算、tool_call 参数漂移 | 需替换执行边界或阻断 P4 |
| G0-Base | 通过 | 打包产物在真实 Pi 1.6.0 中加载：`loaded rows=3 status=1 first=32` | 公开 TUI/Theme 契约已记录 |
| G0-Edit | 通过 | `docs/compatibility.md` §2.2-2.3、§3 | 本地 source 交付 `details` v1；安装版 0.1.1 仍需升级 |
| G0-Todo | 通过 | `docs/compatibility.md` §4.2 | HUD、持久化、分支替换、reload、共存、高度上限 |
| G0-Approval | 阻断 | `docs/approval-findings.md` | tool_call 最终参数漂移；reload 不结算 custom Promise |
| P1-01 Component 契约 | 完成 | `src/core/layout.ts` | 复用 `@earendil-works/pi-tui` 公开契约 |
| P1-02 Theme / Layout | 完成 | `src/core/{theme,ansi,layout}.ts` | tone 映射、DCS/OSC/CSI 清理、宽度工具 |
| P1-03 Panel / StatusLine | 完成 | `src/components/*`、`examples/gallery.ts` | 标题嵌入边框、路径中间省略、窄宽降级 |
| G1 | 通过 | `tests/unit/widths.test.ts` | 0/1/2/10/40/80/120/240 列无越界 |
| P2-01 数据契约与 Adapter | 完成 | `src/diff/{types,adapter}.ts`、Hashline `src/edit-details.ts` | version 1；未知版本返回 `undefined` |
| P2-02 CodeFrame | 完成 | `src/components/code-frame.ts` | 双侧行号、wrapping、缩进、折叠/截断提示 |
| P2-03 EditView | 完成 | `src/views/edit.ts` | 多文件、partial/error/not_written、stats |
| P2-04 Pi 集成探针 | 完成 | 真实 Pi TUI + 打包 0.2.0 | resolver 仅接管 `hashline`，`renderShell: "self"` |
| P3-01 Store / Tool | 完成 | `pi-session-todo`：store/session/actions/tool，34 个测试 | 串行/并行、稳定 ID、revision CAS |
| P3-02 Persistence | 完成 | `pi-session-todo`：version 1 snapshot、branch 水合、EACCES、损坏只读 | 先落盘再发布 |
| P3-03 TreeList / TodoView | 完成 | `src/components/tree-list.ts`、`src/views/todo.ts`、60 个测试 | 纯展示；默认 4 阶段/5 任务，活跃任务优先 |
| P3-04 Widget 集成 | 完成 | `pi-session-todo/src/widget.ts` + 真实 TUI | `aboveEditor`、高度预算、自动隐藏 |
| G2 | 部分通过（核心验收） | A/B/C 请求/文件/content/schema；40-240 宽度；折叠/展开；partial/not_written/stale/REM/MV；旧 Session 回放；双主题；`docs/g2-regression.md` | 残余：cancel、中文长行/空 diff 真机 |
| G3 | 通过（主路径） | 真机：parallel/append/rm、项目 todo 列表+claim、branch marker/switch、new 隔离、取消、子代理只读；35 个测试 | 残余：项目 todo status update 真机、/tree UI、排队写入 |
| P3 | 完成（主路径） | G0-Todo 通过、P3 UI + extension 主路径 | 剩余 G3 残余真机项 |
| P4 | 阻断 | G0-Approval | 未实现 ApprovalView 接线；保留现有 Gate |

## 验证记录

| 命令 | 结果 |
|---|---|
| `pnpm test` | 11 个测试文件，60 个测试通过 |
| `pnpm typecheck` | 通过 |
| `pnpm build` | 生成 `dist/`，含 `./diff`、`./views/edit`、`./views/todo` 子路径 |
| `pnpm gallery` | 离线渲染 Edit/partial/Panel/StatusLine，40/80/120/240 列 |
| `pnpm pack` + 真实 Pi TUI | Edit 面板显示 `success · 3ms`、`+1 -1`、`- world`、`+ patched`；文件已写入 |
| Hashline `bun test` | 14 个文件 / 285 个测试通过 |
| Hashline `tsc --noEmit` | 通过 |
| Pi TUI TODO 探针 | widget aboveEditor、重绘、hide/dispose、reload、fork、EACCES、powerline 共存均符合预期 |
| Pi TUI TODO 探针 | 首条消息前 session 目录为空；首条消息后 custom entry 落盘；6 行 widget 会挤压编辑器，cap 后 3 行通过 |
| Pi TUI session 探针 | new/fork/switch/reload 均触发 session_shutdown + widget_dispose + 新 session_start；新实例 generation 重置 |
| Pi TUI rewind 探针 | navigateTree 触发 session_tree、label 落盘、被放弃分支 custom entry 不在新 branch |
| Pi TUI 高度探针 | `clamp(rows-9,1,5)`：22/24 行下 footer 布局与基线一致；12 行限制为 3 行 |
| `pi-session-todo` `pnpm test` | 5 个文件 / 35 个测试通过 |
| `pi-session-todo` `pnpm typecheck` | 通过 |
| `pi-session-todo` 真实 TUI | HUD empty → init/start/done 1/3，串行提升下个任务；3/3 后 4s 自动隐藏 |
| `pi-session-todo` reload | 从 session custom entry 恢复 3/3 HUD |
| `pi-session-todo` hide=-1 | `PI_SESSION_TODO_HIDE_MS=-1` 下 12s 后 HUD 仍显示 |
| G3 parallel | 两个任务同时 in_progress；append/rm 后 HUD 正确，不自动推进 |
| G3 项目 todo | 同一进程 `todo` 列表 + claim 与 session HUD 共存 |
| G3 branch | navigateTree 回退；`session-todo-branch` 标记使 switch 后保持回退状态 |
| G3 隔离/取消 | new 空 HUD、切回恢复、仅一个 HUD；`session_before_switch` 取消后 Session/HUD 不变 |
| G3 子代理 | `PI_SUBAGENT_CHILD=1` 写入拒绝，view 可用 |
| G2 A/B/C | 新/旧 Hashline × UI 开关：文件、content、schema、provider 请求哈希一致；details 差异仅展示 |
| G2 宽度 | 40/60/80/100/120/160/240 真机 TUI 均显示 Edit 面板与统计 |
| G2 折叠 | `Ctrl+O` 展开 5 hunk；折叠提示消失，统计不变 |
| G2 部分写入 | 只读 b.txt：标题 partial，a 成功写入，b EACCES 保持不变，`+0 -0` |
| G2 stale anchor | EditView 显示 error/路径/Edit rejected，文件未修改 |
| G2 旧 Session | 旧 details `{}` 回放为原始文本，未出现 Edit 面板 |
| G2 not_written | a 成功、b EACCES、c `not written`，文件状态正确 |
| G2 主题 | catppuccin-mocha / nightowl 下 Edit 布局正常 |

## 阻塞与决策

1. G2 仍缺“可安装的 Hashline 兼容版本”：本地 source commit `2d152f7` 已提供 details v1，但 npm 安装版仍是 `0.1.1`。发布/升级后需重跑 A/B。
2. G3 真机矩阵：已完成 init/start/done、自动隐藏、reload；仍缺 parallel/append/rm 真机、branch switch/cancel 与子代理所有权。
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
