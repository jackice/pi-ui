# Pi 集成指南

本页记录已在真实 Pi `1.6.0` + `@earendil-works/pi-tui@1.6.0` 中验证的接入方式。

## Edit：接管 `hashline` 结果

`hashline` 的 `details` 由 Hashline 自身提供，version 为 `1`。UI 库只负责适配与渲染，不修改工具结果。

```ts
import { adaptHashlineDetails, EditView, fromPiTheme } from "@jackice/pi-ui";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

function resultDetails(result: unknown): unknown {
  if (result && typeof result === "object" && "details" in result) return result.details;
  return undefined;
}

export default function (pi: ExtensionAPI) {
  pi.registerToolRenderer((name, next) => {
    const original = next();
    if (name !== "hashline" || !original) return original;

    return {
      ...original,
      renderShell: "self",
      renderCall: (_args, theme) => new Text(theme.fg("accent", "hashline"), 0, 0),
      renderResult: (result, options, theme, context) => {
        const model = adaptHashlineDetails(resultDetails(result), {
          toolCallId: context.toolCallId,
          ...(context.durationMs === undefined ? {} : { durationMs: context.durationMs }),
        });

        if (model === undefined) {
          // 旧 Hashline 或未知版本：保留原始 renderer，绝不伪造 diff。
          return original.renderResult?.(result, options, theme, context) ?? new Text("hashline result", 0, 0);
        }

        const view = new EditView(fromPiTheme(theme), {
          model,
          expanded: options.expanded,
        });
        return {
          render: (width: number) => view.render(width),
          invalidate: () => view.invalidate(),
        };
      },
    };
  });
}
```

### 已验证行为

| 项 | 结果 |
|---|---|
| resolver 只接管 `hashline` | 是；其他工具返回 `original` |
| `renderShell: "self"` | 单一外框，无默认 Box 重复包裹 |
| 执行结果 | 文件实际写入，模型可见 `content` 不变 |
| 原生 `edit` | 默认 renderer 不变 |
| 真实 `details` | JSON 模式与 TUI 均读到 `version: 1` |
| 旧 `hashline@0.1.1` | `details` 为空，`adaptHashlineDetails` 返回 `undefined` |

### 宽度与折叠

- `EditView` 输出行不超过传入 width；跨 40/80/120/240 列验证。
- 默认折叠 3 个文件、3 个 hunk、30 行；`expanded` 展开全部已存储内容。
- UI 折叠与源结果截断使用不同提示，不会把被截断的结果伪装成完整 diff。

## 主题

`fromPiTheme(theme)` 映射：

| UI tone | Pi token |
|---|---|
| `text` | `text` |
| `muted` | `muted` |
| `accent` | `accent` |
| `success` | `success` |
| `warning` | `warning` |
| `error` | `error` |
| `border` | `border` |
| `added` | `success` |
| `removed` | `error` |

未知 token 或宿主主题抛错时降级为原文，不中断 render。

## 安全边界

- `Panel` 标题、`StatusLine` 字段、`CodeFrame` 代码行均经过 `sanitizeLine`/`sanitizeText`
- 清理 CSI/OSC/DCS/C1 与控制字符；组件自身生成的 ANSI 不被清理
- 所有宽度使用 `visibleWidth`，不按 `string.length` 截断
