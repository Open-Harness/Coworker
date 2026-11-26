/**
 * Where a name that anyone can have ends. Not the whole public suffix list: the endings that two-part suffixes are
 * common under, which is enough to keep `acme.co.uk` and `other.co.uk` apart. Any other last label is a suffix by itself.
 */
const TWO_PART = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "me.uk",
  "ltd.uk",
  "plc.uk",
  "net.uk",
  "sch.uk",
  "com.au",
  "net.au",
  "org.au",
  "edu.au",
  "gov.au",
  "id.au",
  "co.nz",
  "org.nz",
  "net.nz",
  "govt.nz",
  "ac.nz",
  "co.jp",
  "ne.jp",
  "or.jp",
  "ac.jp",
  "go.jp",
  "ed.jp",
  "co.za",
  "org.za",
  "gov.za",
  "ac.za",
  "com.br",
  "net.br",
  "org.br",
  "gov.br",
  "com.cn",
  "net.cn",
  "org.cn",
  "gov.cn",
  "edu.cn",
  "com.mx",
  "org.mx",
  "gob.mx",
  "co.in",
  "net.in",
  "org.in",
  "gov.in",
  "ac.in",
  "co.kr",
  "or.kr",
  "ac.kr",
  "go.kr",
  "com.tr",
  "org.tr",
  "net.tr",
  "gov.tr",
  "com.sg",
  "com.hk",
  "com.tw",
  "com.ar",
  "com.co",
  "com.ua",
  "com.pl",
  "co.il",
  "co.id",
  "co.th",
  "github.io",
  "gitlab.io",
  "pages.dev",
  "workers.dev",
  "vercel.app",
  "netlify.app",
  "herokuapp.com",
  "blogspot.com",
]);

/** The name that one owner holds: one label above the suffix. `undefined` when the name is a suffix itself. */
export function owned(domain: string): string | undefined {
  const labels = domain
    .toLowerCase()
    .replace(/\.$/u, "")
    .split(".")
    .filter((one) => one !== "");
  if (labels.length < 2) return undefined;
  const two = labels.slice(-2).join(".");
  const take = TWO_PART.has(two) ? 3 : 2;
  return labels.length < take ? undefined : labels.slice(-take).join(".");
}

/** Relaxed alignment: both belong to the same owner. */
export function belongTogether(a: string, b: string): boolean {
  const [one, other] = [owned(a), owned(b)];
  return one !== undefined && one === other;
}
