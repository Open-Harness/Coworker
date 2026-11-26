import type { ReactNode } from "react";
import type { Answer, Api, Reads } from "~/modules/api/types.ts";

/*
 * What every screen of the console stands on: where it is, what it reads, how it goes elsewhere, and what it looks like
 * before it has anything to show. A screen is a folder in `src/screens/<name>` with a `route.ts` and an `index.tsx`.
 */

export type Params = Readonly<Record<string, string>>;

/** What a screen is given: the parts of its path (`/m/:manager/board` gives `{manager}`), and the query. */
export interface PageProps {
  readonly params: Params;
  readonly search: Params;
}

/** One page of a screen folder, as `route.ts` declares it: its default export is one of these or a list of them. */
export interface ScreenRoute {
  /** Under `/ws/<address>`: `/`, `/inbox`, `/m/:manager/board`. More static parts beat a `:part` at the same place. */
  readonly path: string;
  /** Outside any workspace, the whole path: `/sign-in`. No shell is drawn around it. */
  readonly outside?: true;
  /** How the palette names the page it is opened on: "Home". A manager's pages are named by the manager. */
  readonly place?: string;
}

/** What the shell is told of the page it frames. `path` is under the workspace. */
export interface Here {
  readonly path: string;
  readonly route: ScreenRoute | undefined;
  readonly params: Params;
}

/** Everything a screen of the console asks of the page it is in. The composition root hands it in; nothing else reaches for the window. */
export interface Browser {
  readonly fetch: typeof fetch;
  /** Milliseconds since 1970, from the clock of the page. */
  readonly now: () => number;
  /** A fresh id, for the key of a change: pressing twice is the first press again. */
  readonly newId: () => string;
  /** Leaves for another address: a sign-in page of GitHub, a download. */
  readonly open: (url: string) => void;
  readonly reload: () => void;
  readonly online: { readonly now: () => boolean; readonly subscribe: (listener: () => void) => () => void };
  /** A live socket on a path of this server. Each message is the reads that changed. It answers how to close it. */
  readonly live: (path: string, onChanged: (reads: readonly string[]) => void) => () => void;
}

/** What a read of the console is, at this moment. A read that was answered and is being asked again is still `Ok`. */
export type Read<T> =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Ok"; readonly value: T }
  | { readonly _tag: "Failed"; readonly says: string; readonly status: number }
  | { readonly _tag: "Gone" };

export interface Clock {
  readonly now: () => number;
  /** `09:54`, in the workspace's time zone. */
  readonly time: (at: number) => string;
  /** How a row says when: the time today, `Yesterday`, a weekday this week, else `5 Oct`. */
  readonly short: (at: number) => string;
}

/** Reads and changes outside a workspace: who is signed in, the ways in, joining. Whole paths, answers narrowed by the caller. */
export interface Outside {
  readonly get: (path: string) => Promise<Answer<unknown>>;
  readonly post: (path: string, body: unknown) => Promise<Answer<unknown>>;
}

export type Go = (to: string, options?: { readonly replace?: boolean }) => void;

export interface Gone {
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}

export interface ReadingProps<P extends keyof Reads> {
  readonly from: P;
  readonly parts?: Params;
  /** What the screen looks like while it waits: its own skeleton. */
  readonly loading?: ReactNode;
  /** What a thing that is not there says, and where to go instead. */
  readonly gone?: Gone;
  /** What a failed read says it could not read. */
  readonly failed?: string;
  readonly children: (value: Reads[P]) => ReactNode;
}

export type { Api };
