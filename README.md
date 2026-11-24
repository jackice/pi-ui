# @jackice/pi-ui

Pi 扩展的终端 UI 组件库。首版提供主题适配、ANSI 安全宽度处理、`Panel` 与 `StatusLine`。

- 基线：Pi `1.6.0`、`@earendil-works/pi-tui` `1.6.0`、Node `>=22`
- 当前阶段：Phase 0 完成，Phase 1（G1）组件已实现；Edit/TODO/Approval 尚未通过各自门禁
- 不注册工具、不持久化业务数据、不读取工作区、不批准命令、不持有 AgentSession

## 安装

```bash
pnpm add @jackice/pi-ui
```

`@earendil-works/pi-tui` 为 peer dependency，由 Pi 宿主提供；库不会打包第二套 Pi runtime。

## 使用

```ts
import { fromPiTheme, Panel } from "@jackice/pi-ui";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("pi-ui-demo", {
    description: "Render a pi-ui panel",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") return;

      await ctx.ui.custom<string | undefined>((tui, piTheme, keybindings, done) => {
        const theme = fromPiTheme(piTheme);
        const panel = new Panel(theme, {
          title: "Demo",
          titleRight: "esc to close",
          border: "rounded",
          paddingX: 1,
          children: [new Text("body", 0, 0)],
        });

        return {
          render: (width: number) => panel.render(width),
          handleInput: (data: string) => {
            if (keybindings.matches(data, "tui.select.cancel")) done(undefined);
          },
          invalidate: () => panel.invalidate(),
        };
      });
    },
  });
}
```

## API

| 导出 | 说明 |
|---|---|
| `UiTheme` / `Tone` | 语义 tone：`text` `muted` `accent` `success` `warning` `error` `border` `added` `removed` |
| `fromPiTheme(theme)` | 映射 Pi `Theme.fg` / `bold`；`added→success`、`removed→error`；未知 token 降级为原文 |
| `plainTheme()` | 无 ANSI 的确定性主题，供测试与 Gallery |
| `displayWidth` | 终端显示列宽（CJK/emoji/组合字符/ANSI） |
| `sanitizeLine` / `sanitizeText` | 移除 OSC/CSI/DCS 等控制序列与剩余控制字符 |
| `truncate` / `pad` / `wrap` / `middleTruncate` | 宽度安全文本处理；`pad` 为硬截断 |
| `Panel` | 标题嵌入边框、左右标题、圆角/方角/无边框、X/Y padding、按宽度缓存 |
| `StatusLine` | 图标、标题、路径中间省略、右侧元数据；窄宽优先保留 meta |
| `joinSides` / `rule` / `fitLine` | 布局原语 |

组件通过 `setProps` / `setTheme` 更新，随后调用 `invalidate()`；`invalidate()` 幂等。`render(width)` 同步、无 I/O，返回行不超过 `width`。

## 安全与宽度保证

- 所有行按 `visibleWidth` 计算，不使用 `string.length`
- 宽度 `0/1/2` 安全降级；Panel 在无法容纳边框时退化为无边框
- 外部不可信文本需先 `sanitizeLine` / `sanitizeText`；本库对 `Panel` 标题与 `StatusLine` 字段自动清理
- 组件自身生成的 ANSI 不会被清理
- 不在 render 中注册事件、启动定时器或访问文件

## 兼容性与限制

- 仅声明并验证 Pi `1.6.0`；未测试版本不声称兼容
- 完整 Diff、TODO HUD、Approval 视图依赖：
  - Hashline 版本化结构化 `details`（当前 `0.1.1` 为空）
  - `session_todo` 工具与 Session 持久化探针
  - Guardrails 最终执行参数绑定与取消路径
- 在上述门禁通过前，不提供对应公共导出

详见 [`docs/compatibility.md`](docs/compatibility.md) 与 [`docs/implementation-status.md`](docs/implementation-status.md)。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm gallery
```

Gallery 离线运行，无 LLM、无网络、无文件写入。
