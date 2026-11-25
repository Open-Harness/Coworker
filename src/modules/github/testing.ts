import type { SendOutcome } from "~/modules/triggers/types.ts";
import type { GitHubApi, Installation, Permissions, TokenResult } from "./types.ts";

/** The fake world's webhook secret and App slug. */
export const FAKE_GITHUB_SECRET = "fake-github-webhook-secret";
export const FAKE_APP_SLUG = "co-worker";

const HOUR = 3_600_000;

export interface Comment {
  readonly installation: number;
  readonly repo: string;
  readonly number: number;
  readonly body: string;
}

export interface GrantedToken {
  readonly installation: number;
  readonly repo: string;
  readonly permissions: Permissions;
}

/** GitHub in memory: installations and the repos they reach, comments made, tokens handed out. */
export interface FakeGitHub extends GitHubApi {
  readonly install: (installation: Installation) => void;
  readonly uninstall: (id: number) => void;
  /** Someone who administers these installations signs in: the code GitHub would send back with them. */
  readonly signIn: (...installations: number[]) => string;
  readonly comments: Comment[];
  readonly tokens: GrantedToken[];
  readonly commentsOn: (repo: string, number: number) => readonly string[];
}

export function fakeGitHub(now: () => number = Date.now): FakeGitHub {
  const installations = new Map<number, Installation>();
  const codes = new Map<string, readonly number[]>();
  let made = 0;
  const signIn = (...ids: number[]): string => {
    made += 1;
    const code = `code-${made}`;
    codes.set(code, ids);
    return code;
  };
  const comments: Comment[] = [];
  const tokens: GrantedToken[] = [];
  const reaches = (id: number, repo: string): boolean => installations.get(id)?.repos.includes(repo) ?? false;
  return {
    installUrl: (state) => {
      // GitHub's install page, with the Install button pressed: one workspace always installs the same one.
      const id = 50_000 + [...(state.split("~")[0] ?? "")].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 1_000_000, 7);
      installations.set(id, { id, account: "acme", repos: ["acme/web", "acme/api", "acme/docs"] });
      return `/github/installed?installation_id=${id}&setup_action=install&code=${signIn(id)}&state=${encodeURIComponent(state)}`;
    },
    signIn,
    install: (installation) => void installations.set(installation.id, installation),
    uninstall: (id) => void installations.delete(id),
    comments,
    tokens,
    commentsOn: (repo, number) => comments.filter((comment) => comment.repo === repo && comment.number === number).map(({ body }) => body),
    installation: async (id) => installations.get(id),
    claim: async (id, code) => {
      const mine = codes.get(code);
      codes.delete(code);
      if (mine === undefined) return { _tag: "NotSignedIn" };
      const found = mine.includes(id) ? installations.get(id) : undefined;
      return found === undefined ? { _tag: "NotYours" } : { _tag: "Claimed", installation: found };
    },
    token: async (installation, repo, permissions): Promise<TokenResult> => {
      if (!reaches(installation, repo)) return { _tag: "Failed", reason: "The installation cannot reach that repo" };
      tokens.push({ installation, repo, permissions });
      return { _tag: "Token", token: { token: `ghs_fake${tokens.length}`, repo, permissions, expiresAt: now() + HOUR } };
    },
    comment: async (installation, repo, number, body): Promise<SendOutcome> => {
      if (!reaches(installation, repo)) return { _tag: "Gone", reason: "The installation cannot reach that repo" };
      comments.push({ installation, repo, number, body });
      return { _tag: "Sent" };
    },
  };
}

/** The one the fake world's Worker and its tests share. */
export const gitHubWorld: FakeGitHub = fakeGitHub();
