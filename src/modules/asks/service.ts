import { answerAsk } from "./internal/answer.ts";
import { makeAsk } from "./internal/ask.ts";
import { dueAsk } from "./internal/due.ts";
import { afterUseOf, coversUse } from "./internal/rules.ts";
import { whomOf } from "./internal/whom.ts";
import type { Asks } from "./types.ts";

export const asks: Asks = {
  ask: makeAsk,
  answer: answerAsk,
  due: dueAsk,
  whom: whomOf,
  covers: coversUse,
  afterUse: afterUseOf,
};
