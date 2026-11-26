/* What the connecting of GitHub looks at. The repos Ama can see on GitHub, and what the app is checked for there. */
export const REPOS = [
  { id: "acme/web", about: "The product" }, { id: "acme/docs", about: "The docs site" }, { id: "acme/infra", about: "Servers and deploys" }, { id: "acme/site", about: "The marketing site" },
] as const;
export interface Ability { readonly id: string; readonly does: string; readonly needs: string; /** Missing until a person allows it on GitHub. */ readonly missing?: true }
export const ABILITIES: readonly Ability[] = [
  { id: "read", does: "Read issues, pull requests, reviews and checks", needs: "Issues, Pull requests, Checks: read" },
  { id: "comment", does: "Comment, and reply on a line", needs: "Issues, Pull requests: write" },
  { id: "pr", does: "Open a pull request", needs: "Pull requests: write" },
  { id: "push", does: "Push to its own branches", needs: "Contents: write", missing: true },
  { id: "events", does: "Hear about new issues, comments and merges", needs: "Webhook, signed" },
];
export const STEPS = ["Install the app", "Choose repos", "What it can do there", "Try it", "Done"] as const;
