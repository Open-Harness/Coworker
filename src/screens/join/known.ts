export interface Known {
  readonly name: string;
  readonly address: string;
  readonly people: number;
  readonly managers: number;
  readonly owners: readonly string[];
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

/** `{workspace: {name, address, people, managers, owners}}`: the workspace of the same mail domain, if there is one. */
export function knownOf(body: unknown): Known | null {
  const row = isRecord(body) ? body["workspace"] : undefined;
  if (!isRecord(row)) return null;
  const { name, address, people, managers, owners } = row;
  if (typeof name !== "string" || typeof address !== "string" || typeof people !== "number" || typeof managers !== "number") return null;
  return {
    name,
    address,
    people,
    managers,
    owners: Array.isArray(owners) ? owners.filter((one): one is string => typeof one === "string") : [],
  };
}
