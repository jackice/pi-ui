const FOREGROUND = new Set([39]);
const SIMPLE = new Set([0, 1, 2, 3, 4, 22, 23, 24]);

function allowedCodes(params: number[]): boolean {
  if (params.length === 0) return true;
  if (params[0] === 38) {
    if (params.length === 3) return params[1] === 5 && (params[2] ?? 256) <= 255;
    if (params.length === 5) return params[1] === 2 && params.slice(2).every((value) => value <= 255);
    return false;
  }
  return params.every((code) => SIMPLE.has(code) || FOREGROUND.has(code) || (code >= 30 && code <= 37) || (code >= 90 && code <= 97));
}

function parseSgr(body: string): string | undefined {
  if (!/^[0-9;]*$/.test(body)) return undefined;
  const params = body.length === 0 ? [] : body.split(";").map((value) => Number(value));
  if (!allowedCodes(params)) return undefined;
  return `\x1b[${body}m`;
}

export function sanitizeSgr(text: string, ansi: boolean): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\\r").replace(/\x08/g, "\\b").replace(/\t/g, "    ");
  let output = "";
  for (let index = 0; index < normalized.length; index++) {
    const char = normalized[index]!;
    const code = char.charCodeAt(0);
    if (char === "\x1b") {
      const next = normalized[index + 1];
      if (next === "[") {
        let end = index + 2;
        while (end < normalized.length && /[0-9;]/.test(normalized[end]!)) end++;
        const final = normalized[end];
        if (final === "m") {
          const sequence = parseSgr(normalized.slice(index + 2, end));
          if (ansi && sequence !== undefined) output += sequence;
        }
        index = final === undefined ? normalized.length : end;
        continue;
      }
      if (next === "]" || next === "P" || next === "_" || next === "^" || next === "X") {
        let end = index + 2;
        while (end < normalized.length) {
          if (normalized[end] === "\x07") break;
          if (normalized[end] === "\x1b" && normalized[end + 1] === "\\") { end++; break; }
          end++;
        }
        index = end;
        continue;
      }
      index += 1;
      continue;
    }
    if (code === 0x09) continue;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) continue;
    if ((code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)) continue;
    output += char;
  }
  return output;
}
