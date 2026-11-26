/* What the thread page needs beyond world.ts: the call that is running now, and what the side panel's other views list. */
import { TRACE } from "../../world";

/** The last turn is in progress: this call has started and has not finished. */
export const LIVE_CALL = { name: "edit", target: "src/export/stream.ts" } as const;

export const FILES_TOUCHED = [
  { path: "src/export/stream.ts", what: "Read, then edited: +14 −9" },
  { path: "src/export/stream.test.ts", what: "Run twice: one failed, then 18 passed" },
] as const;

export type View = "changes" | "files" | "terminal" | "may-use";
export const VIEWS: readonly { id: View; label: string; title: string; sub: string }[] = [
  { id: "changes", label: "Changes", title: "Changes to src/export/stream.ts", sub: "Live · 25 Nov, 09:51" },
  { id: "files", label: "Files touched", title: "Files touched", sub: "By this thread, so far" },
  { id: "terminal", label: "Terminal output", title: "Terminal output", sub: "Each command it ran" },
  { id: "may-use", label: "What it may use", title: "What it may use", sub: `Set by Coding, version ${TRACE.version}` },
];

export const TERMINAL = TRACE.turns
  .flatMap((t) => (t.kind === "call" && t.tool === "run" ? [`$ ${t.target}   (${t.took}${t.ok ? "" : ", failed"})\n${t.out}`] : []))
  .join("\n\n");

/** "09:48" on 25 Nov, as an instant the Timestamp can show. */
export const at = (hhmm: string) => `2026-11-25T${hhmm}:00`;
