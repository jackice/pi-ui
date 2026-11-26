# @jackice/pi-ui

A terminal UI library for Pi extensions. It provides theme adapters, ANSI-aware layout, and components for panels, status lines, code diffs, trees, session tasks, and approval prompts.

- Verified with Pi `1.6.0` and `@earendil-works/pi-tui` `1.6.0`. Requires Node `>=22`.
- This preview includes UI components only. It does not register tools, persist tasks, access the workspace, retain an `AgentSession`, or authorize commands.

## Installation

```bash
pnpm add @jackice/pi-ui@next
```

Use the `next` dist-tag to opt in to preview releases.

`@earendil-works/pi-tui` is a peer dependency. The library uses the host's copy rather than bundling another Pi runtime.

## Usage

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

| Export | Description |
|---|---|
| `UiTheme` / `Tone` | Semantic tones: `text`, `muted`, `accent`, `success`, `warning`, `error`, `border`, `added`, and `removed`. |
| `fromPiTheme(theme)` | Adapts Pi's `Theme.fg` and `bold`, mapping `added` to `success` and `removed` to `error`. Falls back to unstyled text for unsupported tokens. |
| `plainTheme()` | Deterministic, ANSI-free theme for tests and the gallery. |
| `displayWidth` | Measures terminal columns, accounting for CJK text, emoji, combining marks, and ANSI sequences. |
| `sanitizeLine` / `sanitizeText` | Strip terminal control sequences and remaining control characters. |
| `truncate` / `pad` / `wrap` / `middleTruncate` | Column-aware text helpers. `pad` hard-truncates text that does not fit. |
| `Panel` | Left and right titles, rounded or square borders, a borderless mode, horizontal and vertical padding, and width-based caching. |
| `StatusLine` | Icon, title, middle-truncated path, and right-aligned metadata. Prioritizes metadata at narrow widths. |
| `SegmentBar` / `layoutSegmentBar` | Left/right segments, elastic center gauge, priority-based compaction, deterministic ANSI-safe layout. |
| `renderSeparator` / `separatorText` | `ascii`, `pipe`, `slash`, `dot`, and `none` separators. |
| `InlineGauge` | Elastic character gauge with unknown/0–100/>100 percent, label avoidance, markers, ASCII fallback, and caching. |
| `ToolCard` | Tool title, status glyph, meta, and titled sections on a `Panel`. Rows are sanitized for control sequences while preserving whitelisted SGR. |
| `CodeBlock` | Source lines with trusted numbers, head/tail logical and visual previews, wrapping, and safety notices. |
| `OutputBlock` | Whitelisted SGR output, head/tail previews, CRLF normalization, bidi stripping, and 1 MiB / 20k line safety limits. |
| `BashView` | Command/status/duration/cwd optional, tail output, truncation and full-output-path notices, with presentation config. |
| `CodeFrame` | Old and new line numbers, diff markers and colors, visible tabs, hanging indents, and folding notices. |
| `adaptHashlineDetails(details)` | Converts Hashline `details` version 1 to an `EditViewModel`. Returns `undefined` for unsupported versions. |
| `EditView` | Multi-file diffs and partial, failed, or unwritten edit results, with folding and source truncation notices. |
| `TreeList` | Generic tree with connector lines, collapsible branches, an ASCII fallback, and a row limit. |
| `TodoView` | Phase progress, active task highlighting, completed and abandoned markers, collapsed future phases, and hidden task counts. |
| `ApprovalView` | Displays the command, working directory, reason, and risk. Supports scrolling, an arming hint, and Allow once or Deny choices. |
| `joinSides` / `rule` / `fitLine` | Layout primitives. |

Tool UI component contract and gates: [docs/tool-ui-contract.md](docs/tool-ui-contract.md).

Update components with `setProps` or `setTheme` and invalidate them with `invalidate()` when needed. Invalidation is idempotent. `render(width)` is synchronous, performs no I/O, and never returns a line wider than `width`.

## Terminal safety and width

- Width is measured in terminal columns, not JavaScript string length.
- Widths of `0`, `1`, and `2` are supported. `Panel` drops its border when it cannot fit.
- Sanitize untrusted text with `sanitizeLine` or `sanitizeText`. `Panel` titles and `StatusLine` fields are sanitized automatically.
- Components preserve their own ANSI styling.
- Rendering does not register event handlers, start timers, or access files.

## Compatibility and limitations

- Compatibility has been verified only against Pi `1.6.0`.
- `EditView` consumes Hashline `details` version 1. Install [`@jackice/hashline@0.1.2`](https://github.com/jackice/hashline#use-as-a-pi-extension) to use it; Hashline `0.1.1` does not provide these details.
- Fall back to the original text renderer when `adaptHashlineDetails` returns `undefined` for older or unsupported results.
- `TodoView` only renders task data. Install [`@jackice/pi-session-todo@0.1.1`](https://github.com/jackice/pi-session-todo#installation) for the `session_todo` tool, persistence, `/session-todo` command, and HUD.
- `ApprovalView` returns a UI choice, not authorization to run a command. The separate approval extension is not part of this preview and remains pending security review.

See the [integration examples](docs/integration.md), [compatibility notes](docs/compatibility.md), and [implementation status](docs/implementation-status.md).

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm gallery
pnpm bench
pnpm bench:startup
pnpm bench:heap
pnpm bench:coldstart
```

The gallery runs offline without an LLM or file writes.
