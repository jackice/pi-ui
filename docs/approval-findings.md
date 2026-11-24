# Approval 探针与阻断结论（G0-Approval）

- 日期：2026-11-24
- 基线：Pi `1.6.0`，真实 tmux PTY，无害 fake bash 执行器
- 结论：现有 `tool_call` Gate + `ctx.ui.custom<T>` 设计 **不满足最终执行参数绑定**；G0-Approval 阻断，P4 不发布

## 1. `custom<T>` 行为

| 场景 | 结果 |
|---|---|
| 打开 | 组件获得键盘输入 |
| Esc | `handleInput` 收到，`done("denied")`，`dispose`，Promise 返回 `denied` |
| Enter | 有效；500ms arm 逻辑可拒绝早期确认 |
| 超时 | 组件内部 `done("timeout")`，`dispose`，Promise 返回 `timeout` |
| Ctrl+C | 组件收到按键，按取消结算 `denied`，`dispose` |
| 工厂抛错 | `custom()` Promise reject，错误被命令捕获 |
| 挂起时 `ctx.reload()` | `dispose` 被调用，`reload_done`；**`custom()` Promise 未结算**（无 result/error） |

结论：审批等待不能只依赖 `custom()` Promise；reload 后必须由 Gate 独立结算等待者。

## 2. `tool_call` 最终参数风险

### 2.1 后续 handler 改写

| 加载顺序 | Gate 看到 | 实际执行 |
|---|---|---|
| Gate 先，mutator 后 | `echo ORIGINAL` | `MUTATED` |
| mutator 先，Gate 后 | `MUTATED` | `MUTATED` |

结论：结果取决于扩展加载顺序；Gate 无法证明自己是最后一个 `tool_call` handler。

### 2.2 `commandPrefix` / `spawnHook`

使用 `createBashToolDefinition(cwd, { commandPrefix, spawnHook, operations })`：

| 阶段 | command | cwd |
|---|---|---|
| `tool_call` Gate | `echo ORIGINAL` | `/tmp/pi-approval/work` |
| `spawnHook` | `echo PREFIX\necho ORIGINAL` | `/tmp/pi-approval/work` |
| `operations.exec` | `echo PREFIX\necho ORIGINAL` | `/tmp/approval-hooked` |

结论：Gate 展示/批准的命令与 cwd 不是最终执行值。

## 3. 运行模式

- `print` 模式：`ctx.mode=print`、`ctx.hasUI=false`；现有 Gate 直接 block，安全但无审批。
- RPC：`ctx.hasUI=true`，但本次未验证可信外部审批通道；应默认拒绝，直到有已验证通道。
- headless：同 print，默认拒绝。
- 子代理：未验证 runtime 通道；默认拒绝。

## 4. 已实施的安全设计：`pi-approval-gate`

1. 用 `registerTool` 替换 `bash`，`execute` 中 await 审批，再调用基础执行器。
2. 基础执行器设置 `spawnHook`，消费一次性 `command + cwd` 指纹；不匹配则抛错，副作用前失败。
3. Gate 自己维护等待者：超时、abort、session shutdown 走同一幂等取消路径，不依赖 `custom()` Promise。
4. 仅支持默认 CLI bash；嵌入式 SDK 的自定义 `commandPrefix`/`spawnHook` 不在支持范围。
5. 安全命令直接透传；危险命令默认 Deny，RPC/headless/子代理默认拒绝。

### 验证

| 场景 | 结果 |
|---|---|
| TUI Deny / Esc | 命令未执行，target 保留 |
| TUI Allow once | arm 后执行，target 删除 |
| 1000ms 超时 | 对话框关闭，命令未执行 |
| headless `-p` | 默认拒绝，target 保留 |
| 最终指纹 | 精确 command/cwd 消费一次；改写抛错 |
| 安全命令 | 无需审批 |
| 队列/abort/shutdown | 单测覆盖，settle 幂等 |

## 5. 发布结论

- 现有 `tool_call` Gate 仍不安全，保持原行为。
- 新 `pi-approval-gate` 在支持的 TUI bash 入口通过 G0-Approval。
- RPC/子代理无可信通道时默认拒绝；独立安全 Reviewer 尚未执行。
- G4 标记为部分通过。
