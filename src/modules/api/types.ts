import type { Answered, Ask } from "~/modules/asks/types.ts";
import type { Doing, WalkStep } from "~/modules/doings/types.ts";
import type { Files, Problem } from "~/modules/playbook/types.ts";
import type {
  ConversationView,
  ChatsOnPhoneView,
  DealsView,
  DealView,
  MailView,
  RepoItemView,
  RepoView,
  SlackView,
} from "~/modules/views-connector/types.ts";
import type {
  BoardView,
  CompareView,
  FillView,
  IntakeView,
  ManagerOverview,
  ManagerSettings,
  PlaybookView,
  SetUpView,
  ThreadPage,
  ThreadsView,
  TriggerView,
  VersionsView,
  WorkView,
} from "~/modules/views-manager/types.ts";
import type * as W from "~/modules/views-workspace/types.ts";
import type { WalkEvent } from "~/modules/walkthrough/types.ts";
import type { McpServer } from "~/modules/mcp/types.ts";

/*
 * The console's whole HTTP surface, under `/api/ws/<workspace>`: its id or its address. Reads are the views; every change is a doing, by the
 * one registry. Pages and evals both go by this map. Sign-in, joining and the workspace's own rows stay where they are.
 */

/** GET. `:x` is a part of the path, `?x` may be in the query. */
export interface Reads {
  "/shell": W.ShellView;
  "/home": W.HomeView;
  "/inbox": W.InboxView;
  "/chats": W.ChatsView;
  "/chats/:chat": W.ChatView;
  "/overview?period": W.OverviewView;
  "/tree": W.TreeView;
  "/coworker": W.CoworkerView;
  "/search?words": W.SearchView;
  "/templates": W.TemplatesView;
  "/templates/:template": FillView;
  "/settings/general": W.GeneralView;
  "/settings/members": W.MembersView;
  "/settings/keys": W.KeysView;
  "/settings/usage": W.UsageView;
  "/settings/audit-log?by&outcome&before": W.AuditView;
  "/settings/billing": W.BillingView;
  "/settings/connectors": W.ConnectorsView;
  "/settings/connectors/github": W.ConnectGithubView;
  "/settings/mcp-servers": W.McpView;
  "/settings/shared": W.SharedView;
  "/settings/me": W.MeView;
  "/set-up/:walk": SetUpView;
  "/m/:manager": ManagerOverview;
  "/m/:manager/intake?from&state&before": IntakeView;
  "/m/:manager/triggers/:trigger": TriggerView;
  "/m/:manager/board": BoardView;
  "/m/:manager/work/:work": WorkView;
  "/m/:manager/threads": ThreadsView;
  "/m/:manager/threads/:thread": ThreadPage;
  "/m/:manager/playbook?version": PlaybookView;
  "/m/:manager/versions": VersionsView;
  "/m/:manager/compare/:trial": CompareView;
  "/m/:manager/settings": ManagerSettings;
  "/m/:manager/connectors/email": MailView;
  "/m/:manager/connectors/email/:conversation": ConversationView;
  "/m/:manager/connectors/whatsapp": ChatsOnPhoneView;
  "/m/:manager/connectors/whatsapp/:conversation": ConversationView;
  "/m/:manager/connectors/slack?channel": SlackView;
  "/m/:manager/connectors/crm": DealsView;
  "/m/:manager/connectors/crm/:deal": DealView;
  "/m/:manager/connectors/github?repo": RepoView;
  "/m/:manager/connectors/github/:number": RepoItemView;
}

export type Values = Readonly<Record<string, unknown>>;

/** What became of a doing. `key`s make a second press the first one again. */
export type Did =
  | { readonly _tag: "Done"; readonly id: string | null; readonly says: string; readonly link: string | null }
  /** It waits for someone's yes: the ask is in their inbox. */
  | { readonly _tag: "Asked"; readonly ask: Ask }
  | { readonly _tag: "Refused"; readonly why: string }
  | { readonly _tag: "Problems"; readonly problems: readonly Problem[] }
  /** Someone changed the same line since `version`. */
  | { readonly _tag: "Clash"; readonly theirs: Files; readonly version: number };

/** POST. */
export interface Writes {
  /** The one door for every change: the id of a doing, its fields, and a key. */
  "/do": { readonly send: { readonly doing: Doing["id"]; readonly values: Values; readonly key: string }; readonly answer: Did };
  /** What the co-worker would do, in order, without doing it. */
  "/walk": {
    readonly send: { readonly doing: Doing["id"]; readonly values: Values };
    readonly answer: { readonly steps: readonly WalkStep[] };
  };
  "/inbox/:ask": { readonly send: { readonly answer: string; readonly always?: "thread" | "person" | "kind" }; readonly answer: Answered };
  "/chats": {
    readonly send: { readonly text: string; readonly key: string; readonly place?: string };
    readonly answer: { readonly chat: string };
  };
  "/chats/:chat": {
    readonly send: { readonly text: string; readonly key: string; readonly place?: string };
    readonly answer: { readonly line: string };
  };
  "/chats/:chat/fork": { readonly send: { readonly line: string }; readonly answer: { readonly chat: string } };
  "/set-up": { readonly send: { readonly said: string }; readonly answer: { readonly walk: string } };
  "/set-up/:walk": { readonly send: WalkEvent; readonly answer: SetUpView | { readonly _tag: "Refused"; readonly why: string } };
  "/templates/:template/try": { readonly send: { readonly place: string }; readonly answer: FillView };
  /** Tell the manager about a conversation, or write as the co-worker, or hand it back. */
  "/m/:manager/connectors/:connector/:conversation": {
    readonly send: { readonly is: "tell" | "write" | "hand back"; readonly text: string; readonly key: string };
    readonly answer: Did;
  };
  "/settings/mcp-servers": {
    readonly send: { readonly name: string; readonly url: string; readonly secret?: string };
    readonly answer: { readonly server: McpServer } | { readonly _tag: "Refused"; readonly why: string };
  };
}

/** What a live socket on `/api/ws/<workspace>/live` sends: which reads changed. The page asks again. */
export interface Changed {
  readonly reads: readonly string[];
}

export type Answer<T> =
  | { readonly _tag: "Ok"; readonly value: T }
  | { readonly _tag: "Problem"; readonly status: 401 | 403 | 404 | 409 | 422 | 429 | 500; readonly says: string };

export interface Api {
  readonly read: <P extends keyof Reads>(path: P, parts?: Readonly<Record<string, string>>) => Promise<Answer<Reads[P]>>;
  readonly write: <P extends keyof Writes>(
    path: P,
    send: Writes[P]["send"],
    parts?: Readonly<Record<string, string>>,
  ) => Promise<Answer<Writes[P]["answer"]>>;
  /** `/api/ws/acme/m/coding/work/ACME-412`. */
  readonly url: (workspace: string, path: keyof Reads | keyof Writes, parts?: Readonly<Record<string, string>>) => string;
}
