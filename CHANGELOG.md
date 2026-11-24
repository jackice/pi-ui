# Changelog

## 0.1.0

- 初始化 `@jackice/pi-ui` 仓库与 pnpm/TypeScript/Vitest 工具链
- 新增 `UiTheme` / `fromPiTheme` / `plainTheme`，映射 Pi 1.6.0 主题 token
- 新增 ANSI 安全的 `displayWidth`、`sanitizeLine`、`truncate`、`pad`、`wrap`、`middleTruncate`
- 新增 `Panel`：边框、左右标题、padding、宽度缓存、窄宽降级
- 新增 `StatusLine`：图标、标题、路径中间省略、右侧元数据
- 新增 0/1/2/10/40/80/120/240 列宽度矩阵测试与离线 Gallery
- Phase 0 兼容性报告：`docs/compatibility.md`
