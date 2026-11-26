import { afterCorrection, mayWiden } from "./internal/corrections.ts";
import { decide } from "./internal/decide.ts";
import { gate } from "./internal/gate.ts";
import { question } from "./internal/question.ts";
import { settled } from "./internal/settled.ts";
import { verdicts } from "./internal/verdicts.ts";
import type { Intake } from "./types.ts";

export const intake: Intake = { gate, settled, question, verdicts, decide, afterCorrection, mayWiden };
