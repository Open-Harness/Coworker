/* Whether a text speaks to us: `@juno`, not in a quote, not in code, not part of an address or of a longer name. */

const FENCED = /```[\s\S]*?(?:```|$)/gu;
const INLINE = /`[^`\n]*`/gu;
const QUOTE = /^[ \t]*>.*$/gmu;
const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

export function mentions(text: string, mention: string): boolean {
  if (mention === "") return false;
  const spoken = text.replace(FENCED, " ").replace(INLINE, " ").replace(QUOTE, " ");
  return new RegExp(`(?<![\\w@./-])${escape(mention)}(?![\\w-])`, "iu").test(spoken);
}
