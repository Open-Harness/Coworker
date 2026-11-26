/* The issues a text says it closes, in this repo only: `Fixes #12`, `closes: #13`, `resolves https://github.com/acme/tool/issues/14`. */

const WORDS = "close[sd]?|fix(?:e[sd])?|resolve[sd]?";

export function closes(body: string, repo: string): readonly number[] {
  const found: number[] = [];
  const same = new RegExp(
    `(?<![\\w-])(?:${WORDS}):?[ \\t]+(?:#(\\d+)|https://github\\.com/([\\w.-]+/[\\w.-]+)/issues/(\\d+))(?![\\w-])`,
    "giu",
  );
  for (const match of body.matchAll(same)) {
    const number = match[1] ?? (match[2]?.toLowerCase() === repo.toLowerCase() ? match[3] : undefined);
    if (number !== undefined && !found.includes(Number(number))) found.push(Number(number));
  }
  return found;
}
