import { templates } from "~/modules/templates/service.ts";
import type { Template } from "~/modules/templates/types.ts";

/*
 * Ours, as files in `docs/templates`, given in by the composition root (the templates module reads a folder; it never opens one).
 * Vite puts the files into the Worker as text; each folder is one template.
 */
const FILES = import.meta.glob("/docs/templates/*/**/*", { query: "?raw", import: "default", eager: true }) as Readonly<
  Record<string, string>
>;

function folders(): ReadonlyMap<string, Record<string, string>> {
  const found = new Map<string, Record<string, string>>();
  for (const [path, text] of Object.entries(FILES)) {
    const [, , , id = "", ...rest] = path.split("/");
    found.set(id, { ...found.get(id), [rest.join("/")]: text });
  }
  return found;
}

/** Every template that reads. One that does not is left out, and says so in the log, so that the others still start. */
export function readOurs(report: (message: string) => void): readonly Template[] {
  return [...folders()].flatMap(([id, files]) => {
    const read = templates.read(files);
    if (read._tag === "Template") return [read.template];
    report(`The template ${id} does not read: ${read.problems.map(({ at, says }) => `${at}: ${says}`).join("; ")}`);
    return [];
  });
}
