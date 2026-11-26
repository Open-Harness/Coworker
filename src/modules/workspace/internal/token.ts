import { github } from "~/modules/github/service.ts";
import type { GitHubApi, GitHubConnection } from "~/modules/github/types.ts";
import type { ReplyAddress } from "~/modules/triggers/types.ts";

type Thread = Extract<ReplyAddress, { kind: "github" }>;

/** What a command that is not on a GitHub thread may do: read the repo to clone and test it. */
const CLONE: Readonly<Record<string, "read">> = { contents: "read", metadata: "read" };

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

/** The Task's stored reply address, if it is a GitHub thread. */
function threadOf(value: unknown): Thread | undefined {
  if (!isRecord(value) || value["kind"] !== "github") return undefined;
  const { installation, repo, number, fork } = value;
  if (typeof installation !== "number" || typeof repo !== "string" || typeof number !== "number") return undefined;
  return { kind: "github", installation, repo, number, fork: fork === true };
}

/**
 * The token one command gets as `GH_TOKEN`, made fresh for it and never kept, or none.
 * - A Task that came from a GitHub thread: that thread's repo, as `github.repoToken` says (read-only for a fork).
 * - Any other Task: the manager's repo, if it hears exactly one, to read.
 * - Only ever through this workspace's own installation: an address naming another installation, or a repo it does not
 *   reach, gets nothing. A gone installation or a failed token also gets nothing, and the command still runs.
 */
export async function commandToken(
  api: GitHubApi,
  connection: GitHubConnection,
  request: { readonly managerId: string; readonly thread?: unknown },
): Promise<string | undefined> {
  const own = connection.installation;
  if (own === undefined) return undefined;
  try {
    const thread = threadOf(request.thread);
    if (thread !== undefined) {
      if (thread.installation !== own.id || !own.repos.includes(thread.repo)) return undefined;
      const made = await github.repoToken(api, thread);
      return made._tag === "Token" ? made.token.token : undefined;
    }
    const heard = [...new Set(connection.sources.filter(({ managerId }) => managerId === request.managerId).map(({ repo }) => repo))];
    const [only] = heard;
    if (heard.length !== 1 || only === undefined || !own.repos.includes(only)) return undefined;
    const made = await api.token(own.id, only, CLONE);
    return made._tag === "Token" ? made.token.token : undefined;
  } catch {
    return undefined;
  }
}
