/** 统一的 unknown 对象守卫；字段仍需各自校验。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
