import type { Report } from "../types.ts";

type Why = NonNullable<Report["why"]>;

const NO_SUCH =
  /\b(?:user|recipient|address|mailbox|account)\b[^.\n]{0,40}\b(?:unknown|not found|not exist|doesn.?t exist|does not exist|invalid|not listed|couldn.?t be found|wasn.?t found|was not found|could not be found)|unknown (?:user|recipient|address|mailbox)|no such (?:user|recipient|address|mailbox)|not listed in|recipnotfound|invalid (?:recipient|address|mailbox)|does not exist|doesn.?t exist|bad destination mailbox|unrouteable|address rejected|no mailbox here|no longer (?:on server|here|at this address)|address you entered|address couldn.?t be found/iu;
const FULL =
  /mailbox\b[^.\n]{0,20}\bfull|\bover (?:the )?(?:disk |mail(?:box)? )?quota|quota\b[^.\n]{0,20}\bexceed|exceed\w*\b[^.\n]{0,30}\b(?:quota|storage)|insufficient (?:system )?storage|disk quota|storage limit|mailbox size limit/iu;
const NO_ANSWER =
  /connection (?:timed out|refused|reset)|timed out|no route to host|name service error|host or domain name not found|domain (?:name )?not found|host not found|unable to connect|could not connect|network is unreachable|upstream error|server did not respond|no answer from host|unreachable|retry time not reached|lost connection|dns (?:error|failure)/iu;
const REFUSED =
  /spam|blocked|block ?list|black ?list|denied|policy|reject|refus|too (?:big|large)|exceeds? (?:the )?(?:maximum )?(?:message )?size|header error|not permitted|not allowed|relay|authenticat|junk|reputation|forbidden|virus|malware|content/iu;

/** Why it did not arrive, from the status and the words: servers say the same with many words, and a status can be wrong. */
export function whyNot(status: string | null, words: string): Why {
  if (FULL.test(words)) return "full";
  if (NO_SUCH.test(words)) return "no such address";
  if (NO_ANSWER.test(words)) return "no answer";
  if (REFUSED.test(words)) return "refused";
  const [klass = "", subject = "", detail = ""] = (status ?? "").split(".");
  if (subject === "2" && detail === "2") return "full";
  if (klass === "5") {
    if (subject === "1") return "no such address";
    if (subject === "7" || subject === "6" || (subject === "3" && detail === "4") || (subject === "2" && detail === "3")) return "refused";
    if (subject === "4") return "no answer";
  }
  if (klass === "4") return subject === "7" ? "refused" : "no answer";
  return "unknown";
}
