import { Blueprint } from "orthograph";
import { Ask } from "./thing.ts";

export const Asked = Blueprint.event({ ask: Ask.fields.id, to: Ask.fields.to, need: Ask.fields.need });
export const AskAnswered = Blueprint.event({ ask: Ask.fields.id, answer: Ask.fields.answer });
export const AskGone = Blueprint.event({ ask: Ask.fields.id });
