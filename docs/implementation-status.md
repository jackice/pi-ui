# 实施状态

最后更新：2026-11-24

| 任务 | 状态 | 证据 | 备注 |
|---|---|---|---|
| P0-01 环境与源码锁定 | 完成 | `docs/compatibility.md` §1-4 | Bun 全局锁文件记录 1.5.2，磁盘实际 1.6.0 |
| P0-02 Edit 探针 | 未开始 | — | 依赖真实 Pi 驱动与 Hashline 结构化 details |
| P0-02 TODO 探针 | 未开始 | — | 需要 PTY + session 分支回放 |
| P0-02 Approval 探针 | 未开始 | — | 需要最终参数绑定与取消路径 |
| G0-Base | 通过 | 真实 Pi 1.6.0 加载打包产物：`loaded rows=3 status=1 first=32` | 公开 TUI/Theme 契约已记录 |
| G0-Edit | 阻断 | `docs/compatibility.md` §3 | Hashline 0.1.1 `details` 为空 |
| G0-Todo | 阻断 | `docs/compatibility.md` §4.1 | 未跑真实 widget/持久化探针 |
| G0-Approval | 阻断 | `docs/compatibility.md` §4.2 | 现有 Gate 无队列/超时/最终绑定 |
| P1-01 Component 契约 | 完成 | `src/core/layout.ts` | 复用 `@earendil-works/pi-tui` 公开契约 |
| P1-02 Theme / Layout | 完成 | `src/core/{theme,ansi,layout}.ts` | tone 映射、DCS/OSC/CSI 清理、宽度工具 |
| P1-03 Panel / StatusLine | 完成 | `src/components/*`、`examples/gallery.ts` | 标题嵌入边框、路径中间省略、窄宽降级 |
| G1 | 通过 | `tests/unit/widths.test.ts` | 0/1/2/10/40/80/120/240 列无越界 |
| P2-P4 | 阻断 | 上述 G0 门禁 | 未冻结接口前不实现完整 Edit/TODO/Approval |

## 验证记录

| 命令 | 结果 |
|---|---|
| `pnpm test` | 6 个测试文件，33 个测试通过 |
| `pnpm typecheck` | 通过 |
| `pnpm build` | 生成 `dist/` |
| `pnpm gallery` | 离线渲染 40/80/120/240 列，无 LLM / 无网络 / 无文件写入 |
| `pnpm pack` + 临时安装 | `@jackice/pi-ui@0.1.0` 可导入，`Panel`/`StatusLine` 渲染正常 |
| `pi -p -ne -e probe.ts` | Pi 1.6.0 成功加载扩展，输出 `[pi-ui-probe] loaded rows=3 status=1 first=32` |

## 阻塞与决策

1. G0-Edit：需要先在 `hashline` 仓库交付版本化结构化 `details`，再由本库 adapter 消费。未交付前不实现“完整 Diff”声称。
2. G0-Todo：`session_todo` 工具尚未创建；项目级 `todo` 保持不变。
3. G0-Approval：现有 `permission-gate.ts` 仅覆盖 `bash`，无最终参数绑定；P4 不得在未验证入口发布美化审批。
4. 子代理模型代理 403，Phase 0 并行侦查改为主会话直接取证；不影响本仓库代码。
5. P1 仅导出 `Panel` / `StatusLine` 与 core；未创建无消费者的 CodeFrame/TreeList/Dialog。

## 复现

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm gallery
```
