# Changelog

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
