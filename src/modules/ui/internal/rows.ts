import type { ChatView, TranscriptBlock } from "~/modules/transcript/types.ts";

export type AnswerBlock = Extract<TranscriptBlock, { readonly kind: "answer" }>;
export type Row =
  | { readonly kind: "block"; readonly block: Exclude<TranscriptBlock, AnswerBlock> }
  | { readonly kind: "answer"; readonly parts: readonly AnswerBlock[]; readonly streaming?: ChatView["streaming"] };

/** An answer whose tools are still at work shows that itself. */
const isBusy = (part: AnswerBlock | undefined): boolean =>
  part !== undefined && part.calls.some(({ status }) => status === "running" || status === "pending");

/** One row per message: the rounds of an answer become one, with the part being written at its end. */
export function transcriptRows({ blocks, running, streaming }: ChatView): readonly Row[] {
  const rows: Row[] = [];
  for (const block of blocks) {
    const last = rows.at(-1);
    if (block.kind !== "answer") rows.push({ kind: "block", block });
    else if (last?.kind === "answer") rows[rows.length - 1] = { kind: "answer", parts: [...last.parts, block] };
    else rows.push({ kind: "answer", parts: [block] });
  }
  if (!running) return rows;
  const last = rows.at(-1);
  const parts = last?.kind === "answer" ? last.parts : [];
  if (streaming === undefined && isBusy(parts.at(-1))) return rows;
  const writing: Row = { kind: "answer", parts, streaming: streaming ?? { text: "", thinking: "" } };
  return last?.kind === "answer" ? [...rows.slice(0, -1), writing] : [...rows, writing];
}

export function rowKey(row: Row): string {
  if (row.kind === "answer") return `answer ${row.parts[0]?.id ?? "new"}`;
  const { block } = row;
  if (block.kind === "earlier") return "earlier";
  return block.kind === "gap" ? `gap ${block.gap.after}` : `entry ${block.id}`;
}
