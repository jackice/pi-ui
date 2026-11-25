import { describe, expect, it } from "vitest";

import { displayWidth } from "../../src/core/ansi.js";
import { plainTheme } from "../../src/core/theme.js";
import { renderSeparator, separatorText, type SeparatorStyle } from "../../src/components/separator.js";

const STYLES: readonly SeparatorStyle[] = ["ascii", "pipe", "slash", "dot", "none"];

describe("separator", () => {
  it("映射每种样式的稳定文本", () => {
    expect(separatorText("ascii")).toBe(" > ");
    expect(separatorText("pipe")).toBe(" | ");
    expect(separatorText("slash")).toBe(" / ");
    expect(separatorText("dot")).toBe(" · ");
    expect(separatorText("none")).toBe("");
  });

  it("none 不产生任何字符或空格", () => {
    expect(renderSeparator("none", plainTheme())).toBe("");
  });

  it("应用指定 tone 且不改变显示宽度", () => {
    const theme = {
      fg: (tone: string, text: string) => `<${tone}>${text}`,
      bold: (text: string) => text,
    };
    const rendered = renderSeparator("ascii", theme, "accent");
    expect(rendered).toContain("<accent>");
    expect(displayWidth(renderSeparator("ascii", plainTheme()))).toBe(3);
  });

  it("所有样式都可安全渲染", () => {
    for (const style of STYLES) {
      const rendered = renderSeparator(style, plainTheme());
      expect(rendered).toBe(separatorText(style));
    }
  });
});
