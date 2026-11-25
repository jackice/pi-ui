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
| P4-04 安全测试 | 已有回归，待复审 | 66 项测试；新增安装路径别名与来源不可确认的回归 | 独立复审未产出结论 |
| G4 | 部分通过 | 主路径已有证据；候选包在真实 Pi 初始化通过 | 独立复审未产出结论；未接入可信 RPC，保持默认拒绝 |
| P5-02 Snapshot | 完成（部分） | `tests/snapshots/render.test.ts` + 6 个快照 | Panel/StatusLine/CodeFrame/EditView/TodoView |
| P5-03 Performance | 部分完成 | `docs/performance.md`：真实 PTY 对照、120 轮长会话压测、V8/原生分配栈、TODO 工具与 HUD | 等宽状态行优化后，两轮长会话缩放 P95 同组下降约 31% 与 40%；系统峰值未复测 |
| P5-04 交付与回滚 | 部分完成 | 四份 tarball 严格共装；Edit 回原始文本、TODO HUD 隐藏与恢复已实测 | Approval 无保留 Gate 的原生确认切换 |
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
| `pi-approval-gate` `pnpm test` | 5 个文件 / 66 个测试通过；符号链接别名通过，来源缺失或不一致仍阻断 |
| `pi-approval-gate` 安全复审 | 已发起，未产出独立审批结论，不视为通过 |
| 候选包严格共装 | `pi-ui@0.4.2`、`pi-session-todo@0.1.0`、`pi-approval-gate@0.1.1`、`hashline@0.1.2`；`npm install --strict-peer-deps`，两扩展共用一份 `pi-ui@0.4.2` |
| 从 tarball 启动 Pi 1.6.0 | `bash`、`hashline`、`session_todo` 活动且来源为安装包；TODO HUD 可见。仅验证初始化，不替代审批行为验收 |
| 打包后回滚演练 | 同一历史 Session 移除 Edit resolver 后恢复原始工具文本；TODO `hide/status/show` 保持 revision 与任务计数，Session 文件字节未变 |
| `@jackice/pi-ui@next` 公开安装 | 解析到 `0.4.2`；`--strict-peer-deps` 安装、5 个入口导入及 Panel 渲染通过，npm 完整性值与提交的 tarball 一致 |
| `pi install` 公开扩展共装 | 干净 Pi 1.6.0 通过；`@jackice/hashline@0.1.2` 与 `@jackice/pi-session-todo@0.1.1` 均活动，`/session-todo` 已注册且 HUD 可见；npm 完整性与上传包一致 |
| 原生 `edit` 使用 `pi-ui`（dotfiles） | `settings.json` 的 `editDiff.nativeEdit`；启用、关闭、缺省及日常配置均经 Pi 1.6.0 PTY 验证，无需环境变量 |
| 审批候选 `--omit=peer` 隔离启动 | 修正运行时依赖后加载通过；未执行 Bash 命令，不替代复审 |
| 审批原生选择列表（候选） | `--approval-ui native`；隔离 Pi 1.6.0 PTY 使用真实 Gate 与惰性输入，验证默认拒绝、arm、滚动、Esc、取消、超时和等待队列归零，无命令执行 |

## 阻塞与决策

1. 独立预览已公开：`pi-ui@0.4.2`、`hashline@0.1.2`、`pi-session-todo@0.1.1`。Hashline 的 `latest` 保留 `0.1.1`；TODO 的 `next` 和 `latest` 均为 `0.1.1`，缺少运行时依赖的 `0.1.0` 已标记弃用。审批扩展未发布。
2. G3 残余：`/tree` UI 本身、切换期间排队写入；非阻断。
3. G4 独立 Gate 复审判定阻断接入：手工 Bash 最终参数一致性、按请求绑定的批准凭据和启动前取消仍未闭环。可信 RPC 未接入，保持默认拒绝。
4. P5 残余：优化后无采样器的两轮 PTY 对照已验证时延及 RSS 检查点，尚未复测系统峰值；长会话缩放仍高于默认文本基线。
5. G5 未通过：原生选择列表回滚候选已完成隔离 PTY 验证；待关闭 G4 阻断、验收真实会话切换与重载，并完成支持矩阵与最终发布检查。不发布 v1.0。

## 复现

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm gallery
```
