import type { MailEvents } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const mailEvents: MailEvents = {
  read: () => notBuilt("mailEvents.read"),
  keep: () => notBuilt("mailEvents.keep"),
  conversationOf: () => notBuilt("mailEvents.conversationOf"),
  conversations: () => notBuilt("mailEvents.conversations"),
  told: () => notBuilt("mailEvents.told"),
  answer: () => notBuilt("mailEvents.answer"),
  asWork: () => notBuilt("mailEvents.asWork"),
};
