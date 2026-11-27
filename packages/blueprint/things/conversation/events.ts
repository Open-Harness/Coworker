import { Blueprint } from "orthograph";
import { Conversation } from "./thing.ts";
import { Words } from "../../values/coworker.ts";

export const ConversationFollowed = Blueprint.event({ conversation: Conversation.fields.id, work: Conversation.fields.work });
export const ConversationTold = Blueprint.event({ conversation: Conversation.fields.id, text: Words });
export const ConversationTaken = Blueprint.event({ conversation: Conversation.fields.id, person: Conversation.fields.person });
export const ConversationHandedBack = Blueprint.event({ conversation: Conversation.fields.id });
export const ConversationStopped = Blueprint.event({ conversation: Conversation.fields.id });
