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

## 4. 可选的安全设计（未实施）

要让 bash 审批绑定最终参数，需要把审批放到执行边界，而不是 `tool_call`：

1. 替换 `bash` 工具定义（`createBashToolDefinition`），在 `execute` 中 await 审批，再调用基础执行器。
2. 基础执行器设置 `spawnHook`，用一次性指纹校验 `spawnCtx.command` / `spawnCtx.cwd`；不匹配则抛错，保证副作用前消费批准。
3. Gate 自己维护等待者：超时、abort、session shutdown、reload 都走同一幂等取消路径；不依赖 `custom()` Promise。
4. 仅支持默认 CLI bash（无自定义 `commandPrefix`/`spawnHook`）；嵌入式或自定义执行配置不纳入审批支持。
5. 替换 bash 会改变工具注册与执行语义，需要单独评审；在完成前 P4 不发布。

## 5. 发布结论

- G0-Approval 阻断。
- 保留现有 `permission-gate.ts` 行为：TUI `select`、非 UI 默认 block。
- 不实现/发布 `ApprovalView` 接线，不把 `custom<T>` 美化审批接入真实 bash。
