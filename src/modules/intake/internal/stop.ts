/** A text that is only the word stop: case, a leading `/`, leading @mentions and closing punctuation are ignored. */
export function saysStop(text: string): boolean {
  let rest = text.trim().toLowerCase();
  for (;;) {
    const next = rest.replace(/^(?:@\S+|\/)\s*/u, "");
    if (next === rest) break;
    rest = next;
  }
  return rest.replace(/[\s.!?,;:]+$/u, "") === "stop";
}
