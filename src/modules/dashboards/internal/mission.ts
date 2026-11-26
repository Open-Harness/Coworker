const MAX = 200;

/** The first paragraph that is not a heading, in one line. */
export function missionLine(body: string): string {
  const paragraph = body
    .split(/\n\s*\n/u)
    .map((part) => part.trim())
    .find((part) => part !== "" && !part.startsWith("#"));
  const line = (paragraph ?? "").replace(/\s+/gu, " ");
  return line.length > MAX ? `${line.slice(0, MAX - 1).trimEnd()}…` : line;
}
