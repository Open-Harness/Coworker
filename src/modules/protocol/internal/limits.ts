export const LIMITS = {
  requestId: 128,
  title: 120,
  prompt: 100_000,
  instructions: 20_000,
  /** What someone may write to have an agent drafted. */
  draft: 4_000,
  entryPage: 50,
  queuedPrompts: 20,
  /** Characters of one client frame. JSON may escape each prompt character as six. */
  clientFrame: 100_000 * 6 + 2_048,
  /** Characters of one server frame. celld allows 1 MiB per message; UTF-8 can take three bytes per character. */
  serverFrame: 300_000,
} as const;
