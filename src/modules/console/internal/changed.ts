/** The reads a doing changed, as `api/types.ts` names them: a page that has them open asks again. */
export function readsOf(doing: string, values: Readonly<Record<string, unknown>>, made: string | null): readonly string[] {
  const text = (name: string): string => (typeof values[name] === "string" ? values[name] : "");
  const manager = text("manager") || (doing === "manager.make" ? (made ?? "") : "");
  const own =
    manager === ""
      ? []
      : [`/m/${manager}`, `/m/${manager}/board`, `/m/${manager}/intake`, `/m/${manager}/playbook`, `/m/${manager}/versions`];
  const work = text("work") === "" ? [] : [`/m/${manager}/work/${text("work")}`];
  const more = [text("handTo"), text("above")].filter((one) => one !== "").flatMap((one) => [`/m/${one}`, `/m/${one}/board`]);
  const people = doing.startsWith("person.") ? ["/settings/members"] : [];
  return ["/shell", "/tree", "/overview", "/settings/audit-log", ...own, ...work, ...more, ...people];
}
