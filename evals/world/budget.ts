import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * For the jobs only: what the real model has cost, in dollars, across runs and test workers. Past JOBS_BUDGET no call
 * leaves. A line per call is appended, so workers running at once never overwrite each other. Delete the file to start again.
 */

/** In this checkout, not the world's own folder: that one is new for every process, and the spend is for all of them. */
const LEDGER = fileURLToPath(new URL("../../node_modules/.cache/jobs-spend.jsonl", import.meta.url));

/** Dollars per million tokens, in and out. A model not named here is priced as the dearest, so a guess never undercounts. */
const PRICES: Readonly<Record<string, readonly [number, number]>> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
  "claude-opus-5-5": [4, 20],
};
const DEAREST: readonly [number, number] = [10, 50];

export function budget(): number | undefined {
  const set = Number(process.env["JOBS_BUDGET"]);
  return Number.isFinite(set) && set > 0 ? set : undefined;
}

export function spentDollars(): number {
  if (!existsSync(LEDGER)) return 0;
  return readFileSync(LEDGER, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .reduce((sum, line) => sum + Number((JSON.parse(line) as { dollars?: unknown }).dollars ?? 0), 0);
}

/** What one call cost. Where the answer gives no token counts, four characters are taken as a token, both ways. */
export function record(model: string, asked: string, answer: string): number {
  const counted = [...answer.matchAll(/"prompt_tokens":\s*(\d+)[\s\S]{0,40}?"completion_tokens":\s*(\d+)/gu)];
  const input = counted.length > 0 ? counted.reduce((sum, [, n = "0"]) => sum + Number(n), 0) : asked.length / 4;
  const output = counted.length > 0 ? counted.reduce((sum, [, , n = "0"]) => sum + Number(n), 0) : answer.length / 4;
  const [inPrice, outPrice] = PRICES[model] ?? DEAREST;
  const dollars = (input * inPrice + output * outPrice) / 1_000_000;
  mkdirSync(dirname(LEDGER), { recursive: true });
  appendFileSync(LEDGER, `${JSON.stringify({ model, input, output, dollars })}\n`);
  return dollars;
}

/** The model a request names, or "" when it names none. */
export function modelOf(asked: string): string {
  try {
    const body: unknown = JSON.parse(asked);
    return typeof body === "object" && body !== null && typeof (body as { model?: unknown }).model === "string" ? (body as { model: string }).model : "";
  } catch {
    return "";
  }
}

/** A streamed request is asked to end with its token counts, so the spend is counted rather than guessed. */
export function withUsage(asked: string): string {
  try {
    const body = JSON.parse(asked) as Record<string, unknown>;
    return body["stream"] === true ? JSON.stringify({ ...body, stream_options: { include_usage: true } }) : asked;
  } catch {
    return asked;
  }
}
