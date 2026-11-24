# Changelog

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
