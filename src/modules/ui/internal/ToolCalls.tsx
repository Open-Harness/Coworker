import { ChatToolCalls, type ChatToolCallItem } from "@astryxdesign/core/Chat";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import type { ToolCallView } from "~/modules/transcript/types.ts";

/** The argument that says what a call is about. */
const TARGETS = ["title", "url", "instruction", "term", "query", "question", "documentId", "id"];

function targetOf({ args }: ToolCallView): string | undefined {
  for (const key of TARGETS) {
    const value = args[key];
    if (typeof value === "string" && value !== "") return value.length > 80 ? `${value.slice(0, 79)}…` : value;
  }
  return undefined;
}

function callItem(call: ToolCallView): ChatToolCallItem {
  const target = targetOf(call);
  const failed = call.status === "error";
  return {
    key: call.callId,
    name: call.name.replaceAll("_", " "),
    status: call.status,
    ...(target === undefined ? {} : { target }),
    ...(failed ? { errorMessage: call.output?.slice(0, 300) ?? "It did not finish" } : {}),
    ...(call.output === undefined || failed
      ? {}
      : { resultDetail: <CodeBlock code={call.output} size="sm" width="100%" maxHeight={240} isWrapped /> }),
  };
}

/** What the assistant did before or while answering. */
export function ToolCalls({ calls }: { readonly calls: readonly ToolCallView[] }) {
  return <ChatToolCalls calls={calls.map(callItem)} defaultIsExpanded={calls.some(({ status }) => status !== "complete")} />;
}
