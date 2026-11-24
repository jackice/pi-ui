# G2 Edit 回归报告

- 日期：2026-11-24
- 基线：Pi `1.6.0`、`@jackice/pi-ui@0.3.0`、Node `v25.9.0`
- 结论：核心 A/B、宽度矩阵与折叠/展开通过；多文件部分写入、旧 Session 回放等残余项未做真实 TUI 证据

## 1. 可安装版本

| 项 | 值 |
|---|---|
| 新 Hashline tarball | 本地 source `2d152f7`（`details` v1） |
| 旧 Hashline tarball | 已安装 `0.1.1`（`details: {}`） |
| UI | `@jackice/pi-ui@0.3.0` |
| 安装方式 | 临时目录 `pnpm add <tarball> @earendil-works/pi-tui@1.6.0` |
| 加载方式 | `pi -p --no-session -ne -e <installed hashline>/index.ts ...` |

## 2. A/B/C 回归

同一 cwd、同一 fixture、同一 fake provider；只替换 Hashline 版本或是否启用 EditView。

| 用例 | Hashline | UI |
|---|---|---|
| A | 新 | 关闭 |
| B | 新 | EditView |
| C | 旧 | 关闭 |

结果：

| 指标 | A | B | C |
|---|---|---|---|
| 最终文件 sha256 | `bf1a5af4…78b23` | 同 A | 同 A |
| Provider 请求体 sha256 | `b32b1772…700a` | 同 A | 同 A |
| 工具 content sha256 | `db364dcc…007a` | 同 A | 同 A |
| 工具 schema sha256 | `5e935b06…b026` | 同 A | 同 A |
| `details` | `version:1` | `version:1` | `{}` |

结论：
- 启用/禁用 EditView 不改变最终文件字节、模型可见 content、工具 schema、provider 请求。
- 新旧 Hashline 在相同输入下也产生相同文件、content、schema 与请求；唯一差异是展示用 `details`。
- `details` 未进入 provider 请求。

## 3. 真实 TUI 宽度矩阵

tmux `-x W -y 40`，fake provider 执行 read + hashline PUT：

| 宽度 | Edit 面板 | success | `+1 -1` |
|---:|---|---|---|
| 40 | ✓ | ✓ | ✓ |
| 60 | ✓ | ✓ | ✓ |
| 80 | ✓ | ✓ | ✓ |
| 100 | ✓ | ✓ | ✓ |
| 120 | ✓ | ✓ | ✓ |
| 160 | ✓ | ✓ | ✓ |
| 240 | ✓ | ✓ | ✓ |

所有宽度均显示双侧行号、`-/+` 与统计，未观察到外框重复。

## 4. 折叠 / 展开

- 40 行文件、5 个不相邻 hunk。
- 默认折叠：显示 3 个 hunk，末尾 `已折叠 10 行（展开查看）`。
- `Ctrl+O`（`app.tools.expand`）：提示消失，显示全部 5 个 hunk。
- 增删统计始终 `+5 -5`，不受折叠影响。

## 5. 多文件部分写入

两个文件同一补丁，`ro/b.txt` 设为只读：

| 检查项 | 结果 |
|---|---|
| Edit 面板标题 | `partial` |
| `a.txt` | ✓ success，`+1 -1`，实际写入 `patchedA` |
| `ro/b.txt` | ✗ error，EACCES，文件保持 `world` |
| 错误信息 | `Failed to write ro/b.txt… Sections already written: a.txt.` |
| 统计 | 失败文件不虚报成功，显示 `+0 -0` |

结论：多文件部分写入按文件区分成功/失败，未把整个工具误报成功。

## 6. Stale anchor 错误视图

- 使用伪造 `#0000` tag。
- EditView 显示 `error`、文件路径、`Edit rejected` 与当前 hash/上下文。
- 文件未被修改。
- 错误文本同时出现在工具块与错误视图，存在重复但信息一致。

## 7. 残余项

| 项 | 状态 |
|---|---|
| create | Hashline 明确不支持新建文件（提示使用 `write`），不属于 hashline Edit 范围 |
| delete / move | 真机文件效果通过：`REM` 后文件消失，`MV b.txt` 后文件移动；面板截图未捕获 |
| 旧 Session 回放 | 未回放真实历史 session 文件 |
| 主题切换截图 | 未做逐主题截图 |
| not_written / unknown 状态真机 | 单测覆盖，未注入真实未尝试区段 |

因此 G2 标记为“部分通过（核心回归通过）”，不宣称完整 G2。
