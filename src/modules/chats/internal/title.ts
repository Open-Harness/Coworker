export const UNTITLED = "New chat";
const MAX_TITLE = 60;

/** A title from the first prompt: its first line, cut at a word. */
export function titleFrom(prompt: string): string {
  const line = prompt.trim().split("\n")[0]?.replace(/\s+/gu, " ").trim() ?? "";
  if (line.length === 0) return UNTITLED;
  if (line.length <= MAX_TITLE) return line;
  const cut = line.slice(0, MAX_TITLE);
  const space = cut.lastIndexOf(" ");
  return `${space > MAX_TITLE / 2 ? cut.slice(0, space) : cut}…`;
}
