# Tool UI 共享组件契约（T2-01 审计）

日期：2026-11-26 · 对应 `dotfiles/docs/pi-tool-ui-implementation-plan-v1.0.md` §7。

## 现有可复用能力

| 能力 | 位置 | 可复用点 | 限制 |
|---|---|---|---|
| 边框/标题/分区 | `src/components/panel.ts` | 圆角/方角/无边框、`title`、`titleRight`、`tone`、`paddingX/Y`、子渲染器 | 无分区标题/分隔线语义，需要上层组合 |
| 状态行 | `src/components/status-line.ts` | 图标、标题、路径、meta、tone | 单行，不负责卡片外框 |
| Diff 行号/折叠 | `src/components/code-frame.ts` | `DiffHunk`、gutter、展开、hunk 折叠 | 只面向 Diff hunk；不得改签名 |
| 布局 | `src/core/layout.ts` | `Renderable`、`rule`、`joinSides`、`fitLine`、`renderChildLines` | 无表格/分区原语 |
| 宽度/ANSI | `src/core/ansi.ts` | `displayWidth`、`wrap`、`truncate`、`pad`、`sanitizeLine/Text` | `sanitizeText` 会移除 SGR 与 U+200D，不可直接用于需要保留 SGR 的 OutputBlock |
| 主题 | `src/core/theme.ts` | `UiTheme`、`fromPiTheme`、`plainTheme`、`Tone` | 仅 fg/bold，无背景色 |

## 缺失能力（T2 新增）

1. `ToolCard`：状态、meta、分区标题/分隔线；复用 `Panel` 但不复制其边框实现。
2. `CodeBlock`：源码行、可信行号、head/tail 预览、折行、样式注入；不复用 `CodeFrame` 的 diff hunk 结构。
3. `OutputBlock`：受限 SGR 重建、tail/head 预览、隐藏计数；需要独立的安全显示路径，不能改已发布 `sanitizeText` 语义。
4. `PathLabel`/`Preview`：优先纯函数；若只是单行组合则留在调用侧。

## 冻结边界

- 不修改 `CodeFrame` 的 `DiffHunk`/`DiffLine` 契约与现有导出。
- 新组件通过根导出新增；不删除/重命名 0.4.2/0.5.x 已声明符号。
- 组件只接收已净化的行与主题；不解析工具协议、不执行 I/O、不注册 timer。
- 高亮由调用方注入已验证行；组件不 import Pi coding-agent。

## 后续

T2-02…T2-05 按本审计实现；每项先写失败测试。版本号在实现前检查 registry 再冻结。
