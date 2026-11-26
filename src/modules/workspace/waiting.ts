import type { ActionRecord } from "~/modules/actions/types.ts";

/* What waits in a workspace's Inbox for a person, and the audit lines sent to its log: approvals, questions and requests to join. */

/** One audit line on its way to the workspace's log. The key makes sending it twice harmless. */
export interface AuditLine {
  readonly key: string;
  readonly managerId: string;
  readonly record: ActionRecord;
}

/** Who waits on an answer: kept with the item, so the answer can be taken back to it. */
export interface Waiter {
  readonly managerId: string;
  readonly taskId: number;
  readonly key: string;
}

/** A task or page a question links to. */
export interface QuestionRef {
  readonly kind: "task" | "page";
  readonly ref: string;
  readonly title: string;
  readonly sub: string;
}

/** What a person needs to decide a question: why it reached them, what is known, the choices and where to look. */
export interface QuestionDetail {
  readonly context?: string;
  readonly facts: readonly { readonly text: string; readonly source?: QuestionRef }[];
  readonly choices: readonly { readonly label: string; readonly next: readonly string[]; readonly risk?: string; readonly cost?: string }[];
  readonly recommend?: { readonly option: string; readonly why: string };
  readonly links: readonly QuestionRef[];
}

/** An Inbox item: an approval of an action set to ask, or a question. */
export interface InboxRequest {
  /** One item per id, however often it is sent. */
  readonly id: string;
  readonly kind: "approval" | "question";
  /** The person who answers, as a person id: `email:ama@example.test`. */
  readonly to: string;
  readonly managerId: string;
  readonly managerName: string;
  readonly title: string;
  readonly options: readonly string[];
  readonly task?: string;
  readonly detail?: QuestionDetail;
  readonly waiter: Waiter;
}

/** What a person said: one of the options, or their own words. */
export type Answer = {
  readonly decision: "allow" | "always" | "deny" | "text";
  readonly text: string;
  readonly byId: string;
  readonly byName: string;
};

export type AskResult = { readonly _tag: "Asked" } | { readonly _tag: "Answered"; readonly answer: Answer };
