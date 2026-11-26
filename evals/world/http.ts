/* Small helpers of the fakes. */

export type Json = Readonly<Record<string, unknown>>;
export const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
export const json = (body: unknown, status = 200): Response => Response.json(body, { status });
export const text = (value: unknown): string => (typeof value === "string" ? value : "");
export const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

export async function bodyOf(request: Request): Promise<Json> {
  const value: unknown = await request.json().catch(() => undefined);
  return isRecord(value) ? value : {};
}

let counted = 1000;
/** The next number of the world: ids on the outside are never reused. */
export const next = (): number => (counted += 1);

let ticks = 0;
/** GitHub's times are whole seconds, and every change is later than the one before it. */
export const stamp = (): string => {
  ticks = Math.max(ticks + 1000, Math.floor(Date.now() / 1000) * 1000);
  return new Date(ticks).toISOString().replace(/\.\d+Z$/u, "Z");
};
