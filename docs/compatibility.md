# Pi UI 兼容性报告（Phase 0）

- 基线日期：2026-11-24
- 状态：G0-Base 已通过；G0-Edit / G0-Todo / G0-Approval 未通过（真实探针未执行）
- 依据：本机实际安装产物与源码，不以计划中的示意类型代替 SDK 类型

## 1. 环境锁定（P0-01）

| 项目 | 实测值 | 证据 |
|---|---|---|
| Pi CLI | `1.6.0` | `pi --version` |
| Pi 包名 | `@earendil-works/pi-coding-agent` | `/Users/jackice/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/package.json` |
| Pi 安装位置 | `/Users/jackice/.bun/install/global/node_modules/@earendil-works/pi-coding-agent` | `readlink -f $(which pi)` |
| Pi 入口 | `dist/bundle/cli.js`（bin `pi`） | 同上 package.json `bin` |
| Pi 公开类型入口 | `dist/index.d.ts`，exports `"."` 与 `"./rpc-entry"` | 同上 package.json `exports` |
| Pi TUI | `@earendil-works/pi-tui` `1.6.0` | `/Users/jackice/.bun/install/global/node_modules/@earendil-works/pi-tui/package.json` |
| Node | `v25.9.0` | `node -v` |
| OS / 架构 | Darwin `25.6.0` / `arm64`（T6050） | `uname -a` |
| 全局包管理器 | Bun global，`~/.bun/install/global` | 安装路径 |

### 1.1 已发现的版本漂移（阻断复现性）

`~/.bun/install/global/bun.lock` 仍记录 `@earendil-works/pi-coding-agent@1.5.2` 与 `@earendil-works/pi-tui@1.5.2`，但磁盘实际安装为 `1.6.0`。

- 结论：锁文件不能作为 1.6.0 的复现依据。
- 处理：本项目以磁盘实际 `1.6.0` + 源码行号为准；G0-Base 的复现环境固定为 `package.json` 中 `@earendil-works/pi-tui@1.6.0` 与本报告记录的 Pi 安装路径。重新安装 Pi 前必须重新核对本报告。

## 2. 公开扩展契约（G0-Base）

源码位置均相对 Pi 安装根目录。

| 能力 | 实测签名/行为 | 证据 |
|---|---|---|
| 工具 renderer resolver | `registerToolRenderer(resolver: ToolRendererResolver): void`；`resolver(toolName, next)`，`next()` 返回剩余 resolver 后的 `{renderShell, renderCall, renderResult}` | `dist/core/extensions/types.d.ts:541`、`:1301` |
| renderer 组合顺序 | resolver 按扩展加载顺序运行；`next() ?? mine` 只补缺 | `docs/extensions.md:2123-2135` |
| 自带外框 | `renderShell?: "default" \| "self"`；`self` 时 renderer 自己负责边框、padding、背景 | `dist/core/extensions/types.d.ts:489`、`docs/extensions.md:2529` |
| renderer 上下文 | `ToolRenderContext` 含 `args/toolCallId/invalidate/lastComponent/state/cwd/executionStarted/argsComplete/isPartial/expanded/showImages/isError/durationMs/outputPad` | `dist/core/extensions/types.d.ts:367-399` |
| Widget | `setWidget(key, string[] \| factory \| undefined, {placement})`；factory 为 `(tui, theme) => Component & {dispose?}`；默认 `aboveEditor` | `dist/core/extensions/types.d.ts:112-116`、`:49-52` |
| 自定义 UI | `custom<T>(factory(tui, theme, keybindings, done), options?) => Promise<T>`；支持 inline/overlay、`blocked` | `dist/core/extensions/types.d.ts:132-152` |
| 持久化 entry | `appendEntry<T>(customType, data?)`，不进入 LLM 上下文 | `dist/core/extensions/types.d.ts:1317`、`docs/extensions.md:1683-1699` |
| 工具拦截 | `tool_call` 在副作用前触发，`event.input` 可原地修改；后续 handler 可见；无重新校验 | `docs/extensions.md:973-999` |
| 运行模式 | `ctx.mode`: `"tui" \| "rpc" \| "json" \| "print"`；`ctx.hasUI` 在 tui/rpc 为 true | `docs/extensions.md:1167-1177` |
| TUI Component | `render(width): readonly string[]`、`invalidate()`、可选 `handleInput`/`handleMouse` | `pi-tui/dist/tui.d.ts:68-96` |
| TUI Container/Text | `Container` / `Text` 均实现上述契约；`Text` 自带换行缓存 | `pi-tui/dist/tui.d.ts:224-238`、`pi-tui/dist/components/text.d.ts` |
| 宽度/ANSI 工具 | `visibleWidth`、`truncateToWidth`、`wrapTextWithAnsi`、`sliceByColumn`、`stripTerminalSequences`、`replaceControlCharacters` | `pi-tui/dist/utils.d.ts`、`pi-tui/dist/index.d.ts` |
| Theme | `Theme.fg(token, text)`、`bold`、`style`、`colors`；token 含 `text/muted/dim/accent/success/warning/error/border/toolTitle/toolOutput/...`，无 `added/removed` | `dist/modes/interactive/theme/theme.d.ts:36-76`、`dist/modes/interactive/theme/theme-tokens.d.ts` |
| 键位提示 | renderer 上下文提供 `keyText`/`keyHint`，避免跨包副本读不到宿主键位 | `dist/core/extensions/types.d.ts:70-86`、`docs/extensions.md:2604-2632` |

### 2.1 宽度与主题适配结论

- `added` 映射 `success`，`removed` 映射 `error`；其余 tone 一一映射到同名 token。
- 文本宽度必须使用 `visibleWidth`，不得用 `string.length`。
- 外部不可信文本先 `stripTerminalSequences` 再 `replaceControlCharacters`；组件自己生成的 ANSI 不过滤。
- 每个 renderer 返回行必须 ≤ 传入 width；宿主会在每行后重置样式。

### 2.2 真实 Pi 加载探针（打包产物）

- 0.1.0：`pnpm pack` → 临时项目安装 → `pi -p --no-session -ne -e ./probe.ts`
  - 实测输出：`[pi-ui-probe] loaded rows=3 status=1 first=32`
  - 结论：Pi 1.6.0 的 jiti 加载器能解析公开 exports。
- 0.2.0（EditView TUI）：本地确定性 provider 返回 `read` → `hashline` 补丁，Pi 加载本地 Hashline source + 打包 `@jackice/pi-ui`。
  - TUI 实测：显示 `Edit` 面板、`success · 3ms`、`✓ update a.txt`、`+1 -1`、`- world`、`+ patched`；文件实际写入 `patched`。
  - JSON 模式实测：工具结果含 `"version":1`、`"operation":"update"`、`"additions":1`。
  - resolver 探针：`hashline` 显示 `PIUI-CALL` / `PIUI-RESULT details=1`，无默认 Box 重复外框。
  - 原生 `edit` 探针：默认 diff 展示，未出现自定义 marker；文件实际写入 `native`。

### 2.3 真实 Edit 探针结论

| 检查项 | 结果 |
|---|---|
| resolver 仅接管 `hashline` | 通过 |
| `renderShell: "self"` 无重复外框 | 通过 |
| 执行结果保留 | 通过 |
| 真实 `details` version 1 | 通过 |
| 原生 `edit` renderer 不变 | 通过 |
| 旧 `0.1.1` 结果降级 | 通过（`details` 空 → adapter 返回 `undefined`） |

## 3. Hashline 集成基线（Edit）

| 项目 | 实测值 | 证据 |
|---|---|---|
| 已安装包版本 | `@jackice/hashline@0.1.1` | `~/.pi/agent/npm/node_modules/@jackice/hashline/package.json` |
| 已安装源码 | `index.ts` sha256 `b8f96ea4...c2fbc43` | `shasum -a 256` |
| 本地源码 commit | `2d152f7bd4777ca51f4f02f2f649f800bcf2da47` | `git -C hashline log -1` |
| 本地/安装差异 | 安装版仍是旧 commit `8e70c41`；本地新增 `details` v1 | 两次 sha256 对比 |
| 扩展入口 | `package.json` `pi.extensions: ["./index.ts"]` | 同上 |
| read 改写 | `pi.on("tool_result")`，仅非错误 `read` | `hashline/index.ts:242` |
| 工具注册 | `pi.registerTool({ name: "hashline", ... })` | `hashline/index.ts:275-276` |
| 本地结果结构 | `details: {version:1,status,files[{path,operation,status,hunks,additions,deletions,...}]}` | `src/edit-details.ts` |
| 已安装结果结构 | 仅文本 `content`；`details` 恒为 `{}` | 安装版 `index.ts` |
| 文本摘要 | 先剥离共同前后缀，再按最多 12 行截断并输出 `...` | `hashline/index.ts:172-205` |
| 自定义 renderer | 无；由 pi-ui resolver 接管 | — |

结论：本地 Hashline source 已提供 version 1 结构化 `details`，真实 Pi TUI/JSON 探针通过；已安装 `0.1.1` 仍为空 details，旧结果必须回退。G2 的“可安装兼容版本”仍需发布/升级后再验收。

## 4. TODO 与权限门禁基线

### 4.1 项目级 TODO（必须共存）

| 项目 | 实测值 | 证据 |
|---|---|---|
| 工具名 | `todo` | `~/.pi/agent/extensions/todos.ts:1264-1265` |
| 命令 | `/todos` | `~/.pi/agent/extensions/todos.ts:1624` |
| 存储 | `.pi/todos` 或 `PI_TODO_PATH` | `todos.ts:69-70,714` |
| 文件哈希 | `088294a0...f66368d` | `shasum -a 256` |
| `session_todo` | 不存在 | `grep -r session_todo ~/.pi/agent/extensions` 无结果 |

### 4.2 TODO HUD 与 appendEntry 探针

真实 Pi 1.6.0 TUI（tmux PTY，100×32）加载临时扩展：

| 检查项 | 结果 | 证据 |
|---|---|---|
| `setWidget` factory + `aboveEditor` | 通过 | widget 固定显示在编辑器上方 |
| 多行/重绘 | 通过 | 显示 2 行；命令后 revision/renders 更新 |
| 隐藏/卸载 | 通过 | `setWidget(key, undefined)` 后 widget 消失，`dispose` 被调用 |
| 首条消息前 appendEntry | 内存可读，未落盘 | `--session-dir` 目录为空 |
| 首条消息后落盘 | 通过 | session JSONL 含 `"type":"custom","customType":"todo-probe"` |
| `--no-session` | 仅内存 | 条目可读，无 session 文件 |
| reload | 通过 | `entries=3 branch=8`，恢复后 widget 重新挂载 |
| fork | 通过 | `entries=4 branch=9`，fork 文件继承 custom entries |
| 写入失败 | 显式报错 | 只读 session 文件：`append_error EACCES: permission denied`，TUI 显示 Error |
| 与全局扩展共存 | 通过 | 同屏出现 TODO widget 与 powerline footer，无重复 widget |
| 极矮终端高度 | 风险 | 12 行终端 + 6 行 widget 被裁剪到 5 行，编辑器输入区被挤出；P3 必须强制高度上限/窄高降级 |
| 切分支/rewind/tree | 未测 | 剩余 P3 验收项 |

结论：HUD 与持久化主路径可用；共存通过；高度预算需要 P3 处理。G0-Todo 标记为“部分通过”，切分支/rewind/tree 仍需在 P3 实现时补齐。

### 4.3 权限门禁（Approval）

| 项目 | 实测值 | 证据 |
|---|---|---|
| 文件 | `~/.pi/agent/extensions/permission-gate.ts`（79 行） | 文件 |
| 文件哈希 | `52b01017...836dd9` | `shasum -a 256` |
| 拦截范围 | 仅 `event.toolName === "bash"` | `permission-gate.ts:51-53` |
| 判定 | `rm` 调用 + 危险模式表（sudo/git push/gh/glab 等） | `permission-gate.ts:27-49,55` |
| UI | `ctx.hasUI` 为假直接 block；否则 `ctx.ui.select` | `permission-gate.ts:57-71` |
| 取消/超时/最终参数绑定 | 未实现；`select` 无超时，批准后无二次参数校验 | 全文 |
| RPC | `ctx.hasUI === true`，仍走 `select` | Pi 文档 `extensions.md:1177` |

结论：P4 需要的最终执行参数绑定、FIFO 队列、默认拒绝、超时/abort 释放均未验证或未实现。G0-Approval 阻断。

## 5. 接入选择（P0-03）

| 能力 | 首版选择 | 理由 |
|---|---|---|
| Edit renderer | 独立 resolver，仅接管 `hashline` | `renderShell: "self"` 与 resolver 均为 1.6.0 公开 API |
| Edit 数据 | Hashline `details` v1；旧结果回退原始 renderer | 本地 source 已交付并通过真实 Pi 探针；安装版 0.1.1 仍需升级 |
| HUD | `setWidget` component factory，`aboveEditor` | 1.6.0 已验证签名 |
| Approval | `custom<T>` + Guardrails 最终参数绑定 | 绑定与取消尚未验证，暂不发布 |

## 6. 门禁状态

| 门禁 | 状态 | 说明 |
|---|---|---|
| G0-Base | 通过 | 版本、公开契约、包入口、工具链已锁定；`pnpm test` / `pnpm typecheck` / `pnpm build` 可复现；打包产物已在真实 Pi 1.6.0 中加载 |
| G0-Edit | 通过 | 真实 Pi 1.6.0 探针：resolver 接管、details v1、执行保留、原生 `edit` 不变；本地 Hashline source 提供 v1 |
| G0-Todo | 部分通过 | HUD、落盘、no-session、reload、fork、写入失败、共存已实测；切分支/rewind/tree 未测，极矮终端需 P3 高度上限 |
| G0-Approval | 阻断 | 未跑最终参数绑定与取消探针；现有 Gate 无队列/超时 |

未验证项不得在 P2/P3/P4 中表述为通过。

## 7. 工具链

- 包管理器：pnpm `11.17.0`
- TypeScript：`5.9.3`，`strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- 测试：Vitest `3.2.7`
- 构建：`tsc -p tsconfig.build.json` → `dist/`
- 运行：`pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm gallery`
- 依赖边界：`@earendil-works/pi-tui` 为 peer + dev；不打包第二套 Pi runtime；core 仅使用其公开导出

## 8. 复现命令

```bash
pi --version
node -v
uname -a
readlink -f "$(which pi)"
cat /Users/jackice/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/package.json
cat /Users/jackice/.bun/install/global/node_modules/@earendil-works/pi-tui/package.json
node -e "console.log(require('/Users/jackice/.pi/agent/npm/node_modules/@jackice/hashline/package.json').version)"
shasum -a 256 /Users/jackice/.pi/agent/npm/node_modules/@jackice/hashline/index.ts
git -C /Users/jackice/dev/src/github.com/jackice/hashline log -1 --format='%H'
shasum -a 256 ~/.pi/agent/extensions/permission-gate.ts ~/.pi/agent/extensions/todos.ts
```
