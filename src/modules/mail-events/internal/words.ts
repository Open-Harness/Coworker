const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

function entity(whole: string, body: string): string {
  if (body.startsWith("#")) {
    const code = body[1]?.toLowerCase() === "x" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  }
  return ENTITIES[body.toLowerCase()] ?? whole;
}

/** What a reader sees of HTML: no styles or scripts, a line for each block, entities opened. */
export function htmlToText(html: string): string {
  return html
    .replaceAll(/<(style|script|head)\b[\s\S]*?<\/\1\s*>/giu, " ")
    .replaceAll(/<!--[\s\S]*?-->/gu, " ")
    .replaceAll(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6]|table|blockquote)\s*>/giu, "\n")
    .replaceAll(/<[^>]*>/gu, "")
    .replaceAll(/&(#?[a-z0-9]+);/giu, entity)
    .replaceAll(/[ \t ]+/gu, " ")
    .replaceAll(/ ?\n ?/gu, "\n")
    .replaceAll(/\n{3,}/gu, "\n\n")
    .trim();
}

export function lines(text: string): string[] {
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
}

const ATTRIBUTION: readonly RegExp[] = [
  /^On\b.{0,300}\bwrote:\s*$/iu,
  /^Am\b.{0,300}\bschrieb\b.{0,200}:\s*$/iu,
  /^Le\b.{0,300}\ba\s+écrit\s*:\s*$/iu,
  /^El\b.{0,300}\bescribió:\s*$/iu,
  /^Op\b.{0,300}\bschreef\b.{0,200}:\s*$/iu,
  /^Il giorno\b.{0,300}\bha scritto:\s*$/iu,
];
const MARKERS = /^\s*(-{2,}\s*(original message|forwarded message|ursprüngliche nachricht|message d'origine)\s*-{2,}|_{20,})\s*$/iu;

/** An attribution line is one line, or two when the first is wrapped. */
function attributes(all: readonly string[], at: number): boolean {
  const line = all[at]?.trim() ?? "";
  if (line === "") return false;
  const next = all[at + 1]?.trim() ?? "";
  return ATTRIBUTION.some((rule) => rule.test(line) || (next !== "" && rule.test(`${line} ${next}`)));
}

/** What is new in a mail: not what it answers, not the quoted lines, not the signature. */
export function whatIsNew(text: string): string {
  const all = lines(text);
  const end = all.findIndex((line, at) => /^--\s?$/u.test(line) || MARKERS.test(line) || attributes(all, at));
  return (end < 0 ? all : all.slice(0, end))
    .filter((line) => !/^\s*>/u.test(line))
    .join("\n")
    .trim();
}
