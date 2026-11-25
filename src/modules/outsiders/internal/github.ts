import { isFailure, type Fetch, type GitPerson, type IssueComment, type MailFailure } from "../types.ts";

type Json = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const failed = (reason: string): MailFailure => ({ _tag: "Failed", reason });

/** The machine user, through GitHub's REST API with its fine-grained token. */
export function githubPerson(settings: { readonly token: string }, fetch: Fetch): GitPerson {
  const call = async (method: string, path: string, body?: unknown): Promise<unknown> => {
    const response = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        authorization: `Bearer ${settings.token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "live-tests",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const parsed: unknown = await response.json().catch(() => undefined);
    return response.ok ? parsed : failed(`GitHub answered ${response.status} to ${method} ${path}`);
  };
  return {
    openIssue: async (repo, title, body) => {
      const made = await call("POST", `/repos/${repo}/issues`, { title, body });
      if (!isRecord(made) || typeof made["number"] !== "number") return isFailure(made) ? made : failed("No issue was made");
      return { repo, number: made["number"], url: typeof made["html_url"] === "string" ? made["html_url"] : "" };
    },
    comments: async ({ repo, number }) => {
      const read = await call("GET", `/repos/${repo}/issues/${number}/comments?per_page=100`);
      if (!Array.isArray(read)) return isFailure(read) ? read : failed("No comments were returned");
      return read.flatMap((item): IssueComment[] => {
        if (!isRecord(item) || typeof item["id"] !== "number" || !isRecord(item["user"])) return [];
        const { login, type } = item["user"];
        return [{ id: item["id"], body: String(item["body"] ?? ""), authorType: String(type ?? ""), author: String(login ?? "") }];
      });
    },
    whoami: async () => {
      const me = await call("GET", "/user");
      if (isFailure(me)) return me;
      return isRecord(me) && typeof me["id"] === "number"
        ? { id: me["id"], login: String(me["login"] ?? "") }
        : failed("GitHub did not say who the token is");
    },
    close: async ({ repo, number }) => void (await call("PATCH", `/repos/${repo}/issues/${number}`, { state: "closed" })),
  };
}
