import { answer } from "./internal/answer.ts";
import { asWork } from "./internal/aswork.ts";
import { allConversations, oneConversation } from "./internal/conversation.ts";
import { read } from "./internal/read.ts";
import { told } from "./internal/told.ts";
import type { MailEvents } from "./types.ts";

export const mailEvents: MailEvents = {
  read,
  keep: (mails, mail) => (mails[mail.id] === undefined ? { ...mails, [mail.id]: mail } : mails),
  conversationOf: oneConversation,
  conversations: allConversations,
  told,
  answer,
  asWork,
};
