# 实施状态

最后更新：2026-11-24

| 任务 | 状态 | 证据 | 备注 |
|---|---|---|---|
| P0-01 环境与源码锁定 | 完成 | `docs/compatibility.md` §1-4 | Bun 全局锁文件记录 1.5.2，磁盘实际 1.6.0 |
| P0-02 Edit 探针 | 完成 | 真实 Pi TUI/JSON：details=1、resolver 接管、执行保留、原生 edit 不变 | 本地 Hashline source |
| P0-02 TODO 探针 | 完成 | 真实 TUI：widget 生命周期、落盘、reload/fork/new/switch/navigate/shutdown、EACCES、共存、高度上限 | `/tree` UI 与取消路径留 P3 |
| P0-02 Approval 探针 | 完成 | TUI deny/allow/timeout、RPC/headless/子代理默认拒绝、最终指纹 | 可信外部审批通道尚未接入 |
| G0-Base | 通过 | 打包产物在真实 Pi 1.6.0 中加载：`loaded rows=3 status=1 first=32` | 公开 TUI/Theme 契约已记录 |
| G0-Edit | 通过 | `docs/compatibility.md` §2.2-2.3、§3 | 本地 source 交付 `details` v1；安装版 0.1.1 仍需升级 |
| G0-Todo | 通过 | `docs/compatibility.md` §4.2 | HUD、持久化、分支替换、reload、共存、高度上限 |
| G0-Approval | 通过（替换执行边界） | `pi-approval-gate`：execute 审批 + spawnHook 指纹；TUI/RPC/headless/子代理默认拒绝已实测 | 可信外部审批通道未接入 |
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
| G2 | 通过（核心验收） | A/B/C；40-240 宽度；折叠；partial/not_written/stale/REM/MV；旧 Session；主题；noop/中文长行；cancel（signal + landed/not_written）；`docs/g2-regression.md` | create 由 Hashline 设计为不支持；真实 Ctrl+C 截图未捕获 |
| G3 | 通过（主路径） | 真机：parallel/append/rm、项目 todo 列表/claim/status update、branch marker/switch、new 隔离、取消、子代理只读；35 个测试 | 残余：/tree UI 本身、切换期间排队写入 |
| P3 | 完成（主路径） | G0-Todo 通过、P3 UI + extension 主路径 | 剩余 G3 非阻断残余 |
| P4-01 Gate / 绑定 | 完成 | `pi-approval-gate`：execute 审批、FIFO、timeout、abort、spawnHook 指纹 | 支持默认 CLI bash |
| P4-02 ApprovalView | 完成 | `src/views/approval.ts` + 6 个测试 | 完整命令/滚动/Deny 默认/arm |
| P4-03 宿主 / 并发 | 完成（主路径） | 单对话框、16 上限、session_shutdown 取消；RPC/子代理默认拒绝已实测 | 可信通道未接入 |
| P4-04 安全测试 | 完成（评审修复） | 独立评审 Critical/High 已修复；policy 51 + gate 6 + binding 3 + dialog 4 | Low 残余：arm 倒计时、审计 entry、复审 |
| G4 | 部分通过（待复审） | 安全评审 C1/H1/H2/H3/M1/M2/M3/M4/M5 修复并回归 | 独立复审、可信 RPC 通道未完成 |
| P5-02 Snapshot | 完成（部分） | `tests/snapshots/render.test.ts` + 6 个快照 | Panel/StatusLine/CodeFrame/EditView/TodoView |
| P5-03 Performance | 部分完成 | `docs/performance.md`：真实 PTY 对照、120 轮长会话压测、V8/原生分配栈、TODO 工具与 HUD | 省去无 Tab 行重建后，长会话缩放累计 JS 分配降低 21.2%；时延与峰值 RSS 未重新测量 |
| G5 | 未通过 | P5 部分、G4 部分 | 不发布 v1.0 |
| P4 | 完成（支持入口） | G0-Approval 通过、ApprovalView/Gate 主路径 | 剩余安全 Reviewer 与可信 RPC 通道 |

## 验证记录

| 命令 | 结果 |
|---|---|
| `pnpm test` | 13 个测试文件，74 个测试通过 |
| `pnpm typecheck` | 通过 |
| `pnpm build` | 生成 `dist/`，含 `./diff`、`./views/edit`、`./views/todo`、`./views/approval` 子路径 |
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
| G3 项目 todo update | `todo update --status closed` 真机成功，文件状态变为 closed |
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
| G2 noop | 无变化补丁显示 `noop` + `no changes`，无伪造 hunk |
| G2 中文长行 | 40 列下 `↪` 续行，未越界 |
| G2 cancel | pre-abort 不写盘；多文件首段落盘后 abort，landed/not_written 正确；details status `cancelled` |
| G0-Approval deny | TUI Esc：命令未执行，target 保留 |
| G0-Approval allow | 等待 arm 后 Enter：target 删除 |
| G0-Approval timeout | 1000ms 超时：对话框关闭，命令未执行 |
| G0-Approval headless | `-p`：危险命令默认拒绝，target 保留 |
| G0-Approval RPC | `--mode rpc`：默认拒绝，事件返回 Blocked，target 保留 |
| G0-Approval 子代理 | `PI_SUBAGENT_CHILD=1`：无对话框，target 保留 |
| Security C1/H1/H2 | `sh -c`/`eval`/`xargs`/引号拼接/`${IFS}`/`git -C push`/reset/clean/delete 等策略回归通过 |
| Security H3 | fullscreen 20 行命令 PgDn 后可见 `rm -rf target` |
| Security M2 | `shellCommandPrefix` 在安全命令执行中生效 |
| Security M3 | `!rm -rf target` 审批 deny/allow 均验证 |
| Security M5 | 重复 bash 注册宿主报 conflict，未静默旁路 |
| Security M4 | bidi/零宽字符被 `sanitizeText` 移除 |
| Security M1 | 5KB 构造输入判定 <50ms |
| G0-Approval binding | 一次性 command+cwd 指纹；改写命令/cwd 抛错 |
| `pi-approval-gate` `pnpm test` | 4 个文件 / 64 个测试通过 |
| `pi-approval-gate` 安全评审 | Critical/High 修复；Low 残余与复审待办 |

## 阻塞与决策

1. G2/G3/G0-Approval 主路径已通过；Hashline 新版本仍为本地 tarball，npm 发布/安装版升级待处理。
2. G3 残余：`/tree` UI 本身、切换期间排队写入；非阻断。
3. G4 残余：独立安全复审、可信 RPC 审批通道；安全评审 Critical/High 已修复。
4. P5 残余：已定位剩余截断与原生分段热点；需优化后再用无采样器的真实 PTY 对照时延与峰值。
5. G5 未通过：需 G4 完成、P5 完整报告与最终发布检查。

## 复现

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm gallery
```
