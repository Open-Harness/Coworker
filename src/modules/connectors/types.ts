import type { Actor, Item } from "~/modules/intake/types.ts";
import type { ActionId, Permission } from "~/modules/reach/types.ts";

/*
 * The one contract of every connector: set up, in, out, skills, view. A connector is a value of this type, in its own
 * module (`github`, `email`, `slack`, `whatsapp`, `crm`, `calendar`); the registry in service.ts lists them.
 */

export type ConnectorId = "github" | "email" | "slack" | "whatsapp" | "crm" | "calendar";
export type ViewShape = "mail" | "chat" | "channels" | "repo" | "deals" | "calendar";

export interface SetUpStep {
  readonly id: string;
  readonly says: string;
  /** `person`: only a person can, on a page that is not ours. */
  readonly by: "itself" | "person";
  readonly link?: string;
}

export type StepState =
  | { readonly _tag: "Waits" }
  | { readonly _tag: "Works"; readonly says: string }
  /** In words, and what to do about it: "Cannot push. Allow Contents: write in the App's settings." */
  | { readonly _tag: "Missing"; readonly says: string; readonly fix: string };

export interface AccountState {
  readonly account: string;
  readonly connector: ConnectorId;
  /** Who the outside sees: always said. */
  readonly as: string;
  readonly holder: { readonly workspace: true } | { readonly person: string; readonly seenBy: "lender" | "shared" };
  readonly works: boolean;
  readonly says: string;
  readonly since: number;
  readonly steps: readonly { readonly step: SetUpStep; readonly state: StepState }[];
  readonly places: readonly string[];
}

export interface EventKind {
  readonly id: string;
  readonly says: string;
}

export interface Arg {
  readonly name: string;
  readonly is: "text" | "number" | "list";
  readonly needed: boolean;
  readonly says: string;
}

export interface ConnectorAction {
  /** `github.comment`. The tool's name is the same with `_`. */
  readonly id: ActionId;
  readonly does: string;
  /** Filled in by us from the reach and the thread. A model never gives these, and a call that does is refused. */
  readonly fixed: readonly string[];
  readonly args: readonly Arg[];
  readonly starts: Permission;
  /** It shows outside. Anything else only reads, or stays a draft. */
  readonly outside: boolean;
}

export type Received =
  | { readonly _tag: "Item"; readonly item: Omit<Item, "id" | "trigger">; readonly follows: readonly string[] }
  /** Ours coming back, or nothing anyone wants to hear: kept, and not judged. */
  | { readonly _tag: "Noise"; readonly why: string }
  | { readonly _tag: "Account"; readonly says: string; readonly works: boolean }
  | { readonly _tag: "Refused"; readonly why: "not signed" | "not ours" | "broken" };

export interface Raw {
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface Place {
  readonly account: string;
  readonly place: string;
  readonly thread: string | null;
}

export type Acted =
  | { readonly _tag: "Done"; readonly says: string; readonly link?: string; readonly id?: string }
  /** Nothing was done and nothing will be by trying again. */
  | { readonly _tag: "Refused"; readonly why: string }
  | { readonly _tag: "TryAgain"; readonly why: string; readonly after: number };

export interface Connector {
  readonly id: ConnectorId;
  readonly name: string;
  readonly setUp: readonly SetUpStep[];
  readonly events: readonly EventKind[];
  readonly actions: readonly ConnectorAction[];
  readonly skills: readonly string[];
  readonly view: ViewShape;
  /** Real or not, whose, which conversation. Reads nothing but `raw` and the secret it is given. */
  readonly receive: (raw: Raw, secret: string) => Promise<Received>;
  /** `key`: the same one twice does it once. */
  readonly act: (action: ActionId, at: Place, args: Readonly<Record<string, unknown>>, key: string) => Promise<Acted>;
  /** What someone is there, asked of the system when it matters: can they write to this repo? */
  readonly standing: (at: Place, actor: Actor) => Promise<Actor["standing"]>;
}

export interface Connectors {
  readonly all: readonly Pick<Connector, "id" | "name" | "setUp" | "events" | "actions" | "skills" | "view">[];
  readonly action: (id: ActionId) => ConnectorAction | undefined;
  /** The args a model gave, checked: none of the fixed ones, every needed one, nothing else. */
  readonly checked: (
    id: ActionId,
    args: unknown,
  ) => { readonly _tag: "Args"; readonly args: Readonly<Record<string, unknown>> } | { readonly _tag: "Wrong"; readonly says: string };
  readonly toolName: (id: ActionId) => string;
}
