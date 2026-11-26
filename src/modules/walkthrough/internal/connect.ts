import type { WalkEvent, Walked, Walkthrough } from "../types.ts";
import { refuse, walked } from "./result.ts";

type Is<T extends WalkEvent["is"]> = Extract<WalkEvent, { is: T }>;

/** Connecting reads the past; skipping reads nothing. */
export function answerConnect(walk: Walkthrough, event: Is<"connected" | "skipped">): Walked {
  if (walk.stage !== "connect") return refuse("There is nothing to connect now.");
  const want = walk.wants.find((one) => one.connector === event.connector);
  if (!want) return refuse(`${event.connector} was not asked for.`);
  if (want.state !== "asked") return refuse(`${event.connector} was answered already.`);
  const state = event.is;
  const wants = walk.wants.map((one) => (one === want ? { ...one, state } : one));
  return walked({ ...walk, wants }, state === "connected" ? ["read the past"] : []);
}

const JUDGEABLE = new Set(["found", "second questions", "draft"]);

/** The person says a finding is wrong; the last words count. */
export function wrong(walk: Walkthrough, event: Is<"that is wrong">): Walked {
  if (!JUDGEABLE.has(walk.stage)) return refuse("There is nothing found to be wrong yet.");
  if (!walk.findings.some((finding) => finding.id === event.finding)) return refuse(`There is no finding ${event.finding}.`);
  const findings = walk.findings.map((finding) => (finding.id === event.finding ? { ...finding, wrong: event.says } : finding));
  return walked({ ...walk, findings });
}
