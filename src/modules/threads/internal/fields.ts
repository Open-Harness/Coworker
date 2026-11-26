/** Narrowing of what a model sent. Each reader returns the value, or nothing and a sentence in `said`. */
export type Said = string[];

export function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Readonly<Record<string, unknown>>) : null;
}

/** Only what the object has of its own: never what its prototype has. */
export function own(from: Readonly<Record<string, unknown>>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(from, key) ? from[key] : undefined;
}

export function has(from: Readonly<Record<string, unknown>>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(from, key);
}

export function text(from: Readonly<Record<string, unknown>>, key: string, path: string, said: Said): string | undefined {
  const value = own(from, key);
  if (typeof value === "string") return value;
  said.push(`${path}${key} must be text.`);
  return undefined;
}

export function maybeText(from: Readonly<Record<string, unknown>>, key: string, path: string, said: Said): string | undefined {
  return own(from, key) === undefined ? undefined : text(from, key, path, said);
}

export function flag(from: Readonly<Record<string, unknown>>, key: string, path: string, said: Said): boolean | undefined {
  const value = own(from, key);
  if (typeof value === "boolean") return value;
  said.push(`${path}${key} must be true or false.`);
  return undefined;
}

export function oneOf<T extends string>(
  from: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  allowed: readonly T[],
  said: Said,
): T | undefined {
  const value = own(from, key);
  const found = allowed.find((one) => one === value);
  if (found !== undefined) return found;
  said.push(`${path}${key} must be one of: ${allowed.join(", ")}.`);
  return undefined;
}

export function listOf<T>(
  from: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  said: Said,
  item: (one: Readonly<Record<string, unknown>>, at: string, said: Said) => T | undefined,
): readonly T[] | undefined {
  const value = own(from, key);
  if (!Array.isArray(value)) {
    said.push(`${path}${key} must be a list.`);
    return undefined;
  }
  const out: T[] = [];
  const items: readonly unknown[] = value;
  items.forEach((one, i) => {
    const at = `${path}${key}[${i}].`;
    const made = record(one);
    if (made === null) said.push(`${path}${key}[${i}] must be an object.`);
    else {
      const got = item(made, at, said);
      if (got !== undefined) out.push(got);
    }
  });
  return out;
}

export function textList(from: Readonly<Record<string, unknown>>, key: string, path: string, said: Said): readonly string[] | undefined {
  const value = own(from, key);
  if (!Array.isArray(value)) {
    said.push(`${path}${key} must be a list of text.`);
    return undefined;
  }
  const items: readonly unknown[] = value;
  const strings = items.filter((one): one is string => typeof one === "string");
  if (strings.length !== items.length) said.push(`${path}${key} must be a list of text only.`);
  return strings.length === items.length ? strings : undefined;
}

export function texts(
  from: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  said: Said,
): Readonly<Record<string, string>> | undefined {
  const value = record(own(from, key));
  if (value === null) {
    said.push(`${path}${key} must be an object of text.`);
    return undefined;
  }
  const entries = Object.entries(value);
  for (const [name, one] of entries) if (typeof one !== "string") said.push(`${path}${key}.${name} must be text.`);
  if (!entries.every(([, one]) => typeof one === "string")) return undefined;
  return Object.fromEntries(entries as [string, string][]);
}

export function number01(from: Readonly<Record<string, unknown>>, key: string, path: string, said: Said): number | undefined {
  const value = own(from, key);
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1) return value;
  said.push(`${path}${key} must be a number from 0 to 1.`);
  return undefined;
}
