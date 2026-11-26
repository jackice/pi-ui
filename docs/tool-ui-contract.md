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

1. `ToolCard`：已实现（`src/components/tool-card.ts`），组合 `Panel`，覆盖标题、状态 glyph、meta、分区；单测覆盖宽度、空分区与 ESC 清理。
2. `CodeBlock`：已实现（`src/components/code-block.ts`），源码行、可信行号、head/tail 预览、折行、样式注入；不复用 `CodeFrame` 的 diff hunk 结构。
3. `OutputBlock`：已实现（`src/components/output-block.ts` + `src/core/safe-sgr.ts`），只重建允许的 SGR，剥离 OSC/DCS/CSI/控制符/bidi；`sanitizeText` 语义不变。
4. `PathLabel`/`Preview`：优先纯函数；若只是单行组合则留在调用侧。

## 冻结边界

- 不修改 `CodeFrame` 的 `DiffHunk`/`DiffLine` 契约与现有导出。
- 新组件通过根导出新增；不删除/重命名 0.4.2/0.5.x 已声明符号。
- 组件只接收已净化的行与主题；不解析工具协议、不执行 I/O、不注册 timer。
- 高亮由调用方注入已验证行；组件不 import Pi coding-agent。

## 已实现 View

- `BashView`（`src/views/bash.ts`）：命令段可选（产品 slot C 由原生 call 独占，`showCommand:false`）；输出 tail 默认 12 行；截断/全量路径提示按宽度 middle-truncate；`showDuration/showCwd/outputRows/ansi/showTruncation/showFullOutputPath` 可配置；Gallery 与单测覆盖折叠/展开/空输出/错误/窄宽/安全上限。
- `command.highlight` 在产品 slot C 下不生效，当前标 unsupported；`command.previewRows` 仅 standalone BashView 可见。

## WriteView

- `WriteView`（`src/views/write.ts`）：path/lineCount、head 6、行号、expanded error 显示请求正文、多行诊断安全显示。产品中 call 仅显示 path，result 独占正文；实时 streaming tail 尚未交付，标为 T4-02 限制。`write.highlight` unsupported。

## 后续

T2-02…T2-05 按本审计实现；每项先写失败测试。版本号在实现前检查 registry 再冻结。

## ReadView (0.6.7)

`ReadView` 只消费 `ReadViewModel`：成功/错误状态、`source`（native/hashline）、`contentKind`、带可选真实行号的 `lines`、`truncation` 与 `rawFallback`。`number: null` 的元数据行不渲染 gutter；没有 `lines` 时只显示 `rawFallback`；不推断文件总行数，图片由宿主处理。
