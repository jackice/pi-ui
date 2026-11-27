# Changelog

## 0.7.3

- 新增 `core/theme`、`views/bash`、`views/write`、`views/read` subpath exports，降低消费者冷启动与 RSS。

## 0.7.2

- `WriteView` 高亮缓存接受 `themeRevision`，主题切换后重新计算。

## 0.7.1

- 高亮输入限制 10,000 行 / 256 KiB；折叠 Write 只高亮 6/12 行并复用组件缓存。
- UI safety limit 时不再显示虚假的 “N more lines”。

## 0.7.0

- `CodeBlock`/`WriteView`/`ReadView` 接受注入式高亮；只处理当前预览行（展开上限 200），异常/行数不符回退纯文本。
- `Highlight` 类型公开。

## 0.6.9

- 全无编号的 ReadView 模型仍走 head 12/24 预览，不再把整段正文当 metadata 输出。

## 0.6.8

- `ReadView` 将 null-number 元数据行移出 CodeBlock 计数，`… N more lines` 不再包含提示行。

## 0.6.7

- 新增 `ReadView`：真实行号/范围、head 12 行、native/hashline 原文回退、truncation 提示；图片由宿主原生处理。
- Gallery 增加 Read fixture。

## 0.6.6

- WriteView：内容超过 20k 行时不再伪造精确隐藏行数，改用安全上限提示。

## 0.6.5

- WriteView：expanded error 显示请求正文；单个尾随 LF 不多计空行；多行诊断逐行净化并保留开头。
- Gallery 增加 Write fixture。

## 0.6.4

- 新增 `WriteView`：路径/行数、head 6 行与 streaming tail 12 行、错误隐藏正文、行号与提示。

## 0.6.3

- 单个多行输入在 split/wrap 前按 20k 逻辑行限流。
- emoji ZWJ/旗帜的安全字素截断；20 列 fullOutputPath 使用短前缀。

## 0.6.2

- 单行超大输入按 UTF-8 字节与安全字素截断，wrap 20k 视觉行即停。
- OutputBlock 保留显式空行；BashView 的 cwd 独立成行并按宽度保留 basename。
- fullOutputPath 按 Output 段实际宽度 middle-truncate。

## 0.6.1

- BashView：命令由原生 call 独占、截断不再误报、fullOutputPath 净化、CRLF 归一、展示配置生效。
- CodeBlock/OutputBlock：视觉截断提示、1 MiB/20k 行安全上限、扩展 bidi 过滤。
- ToolCard：分区行保留白名单 SGR。
- 新增 ToolCard/CodeBlock/BashView snapshot 与宽度/上限测试。

## 0.6.0

- 新增 `ToolCard`：标题、状态 glyph、meta、分区，复用 `Panel`。
- 新增 `CodeBlock`：可信行号、head/tail 预览、视觉折行。
- 新增 `OutputBlock` 与安全 SGR 解析：白名单重建，剥离 OSC/CSI/控制符/bidi。
- 新增 `BashView`：命令 6 行 head、输出 12 行 tail、截断与全量路径提示。
- 既有 `.`、`./diff`、`./views/*` 入口与符号保持兼容。

## 0.5.1

- Edit diff 改为单列行号，相邻重复行号只显示一次。删除行使用旧行号，新增行和上下文优先使用新行号。

## 0.5.0

- 新增 `SegmentBar` / `layoutSegmentBar`：左右分段、弹性 gauge、优先级降级、宽窄矩阵安全、确定性布局
- 新增 `renderSeparator` / `separatorText`：ascii/pipe/slash/dot/none 五种分隔符
- 新增 `InlineGauge`：未知/0-100/>100 百分比、标签避让、缓存、ASCII 与阈值标记
- 三个组件通过根导出 `.` 暴露；既有 `.`、`./diff`、`./views/*` 入口保持兼容
- 测试增至 16 个文件 / 106 个用例

## 0.4.2

- 优化带行号栏的 ANSI 行宽计算；中文、emoji 和其他转义仍使用 Pi TUI 的宽度规则。
- CodeFrame 的无 Tab 行不再逐字符重建原文，保持换行、样式和 Tab 展开行为不变。
- 等宽 ANSI 状态行跳过重复截断；宽字符、复杂转义和溢出仍由原路径处理。

## 0.4.1

- `sanitizeText` 移除 bidi/零宽格式字符，防止审批命令视觉重排
- `ApprovalView` 支持 `tui.select.pageUp/pageDown`，并对非有限 `maxCommandLines` 兜底
- 测试增至 13 个文件 / 74 个用例

## 0.4.0

- 新增 `ApprovalView`：完整命令/cwd/reason/风险、Allow once/Deny、命令滚动、arm 提示
- 新增 `./views/approval` 子路径导出
- 新增 6 个 ApprovalView 测试；真实 `pi-approval-gate` 使用该视图
- 测试增至 13 个文件 / 72 个用例

## 0.3.0

- 新增 `TreeList`：通用节点、递归连接线、折叠、ASCII fallback、行数上限
- 新增 `TodoView`：阶段进度、当前任务高亮、完成/放弃标记、后续阶段折叠、任务优先级与隐藏计数
- 新增 `./views/todo` 子路径导出
- Gallery 接入 TodoView；测试增至 11 个文件 / 60 个用例
- G0-Todo 探针关闭：reload/new/fork/switch/navigateTree/shutdown、persistence、EACCES、共存、高度上限

## 0.2.0

- 新增 `src/diff`：Hashline `details` version 1 适配为 `EditViewModel`，未知版本/损坏结构回退
- 新增 `CodeFrame`：双侧行号、+/- marker、上下文/新增/删除着色、Tab 箭头、悬挂缩进、ANSI 安全换行
- 新增 `EditView`：Panel + StatusLine + CodeFrame，多文件、partial/error/not_written、折叠与源截断提示
- 新增 `./diff` 与 `./views/edit` 子路径导出
- 真实 Pi 1.6.0 TUI 探针验证 resolver 接管 `hashline`、details=1、执行结果保留、原生 `edit` 不受影响
- 测试增至 9 个文件 / 49 个用例

## 0.1.0

- 初始化 `@jackice/pi-ui` 仓库与 pnpm/TypeScript/Vitest 工具链
- 新增 `UiTheme` / `fromPiTheme` / `plainTheme`，映射 Pi 1.6.0 主题 token
- 新增 ANSI 安全的 `displayWidth`、`sanitizeLine`、`truncate`、`pad`、`wrap`、`middleTruncate`
- 新增 `Panel`：边框、左右标题、padding、宽度缓存、窄宽降级
- 新增 `StatusLine`：图标、标题、路径中间省略、右侧元数据
- 新增 0/1/2/10/40/80/120/240 列宽度矩阵测试与离线 Gallery
- Phase 0 兼容性报告：`docs/compatibility.md`
