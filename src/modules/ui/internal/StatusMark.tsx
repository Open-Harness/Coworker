import { StatusDot } from "@astryxdesign/core/StatusDot";
import type { ChatStatus } from "~/modules/protocol/types.ts";

const MARKS = {
  idle: { variant: "neutral", label: "Idle" },
  working: { variant: "accent", label: "Answering" },
  failed: { variant: "error", label: "Stopped with an error" },
} as const;

/** What a chat's assistant is doing. */
export function StatusMark({ status }: { readonly status: ChatStatus }) {
  return <StatusDot {...MARKS[status]} isPulsing={status === "working"} />;
}
