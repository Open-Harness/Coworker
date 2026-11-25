/** One audit line, as far as the export needs it. */
export interface CsvLine {
  readonly at: number;
  readonly by: { readonly kind: string; readonly name: string };
  readonly sentence: string;
  readonly permission: string;
  readonly outcome: string;
  readonly action: string;
  readonly managerId: string;
}

/** A cell that a spreadsheet would run as a formula is made text first. */
const cell = (value: string): string => {
  const safe = /^[=+\-@\t\r]/u.test(value) ? `'${value}` : value;
  return /[",\n\r]/u.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

export function auditCsv(lines: readonly CsvLine[], managerNames: Readonly<Record<string, string>>): string {
  const rows = lines.map((line) => [
    new Date(line.at).toISOString(),
    line.by.name,
    line.by.kind,
    line.sentence,
    line.permission,
    line.outcome,
    line.action,
    line.managerId === "" ? "Workspace" : (managerNames[line.managerId] ?? line.managerId),
  ]);
  return (
    [["When", "Who", "Kind", "What happened", "Ran under", "Outcome", "Action", "Where"], ...rows]
      .map((row) => row.map(cell).join(","))
      .join("\r\n") + "\r\n"
  );
}
