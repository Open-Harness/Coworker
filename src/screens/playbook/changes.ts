import { useState } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { useApi, useBrowser, useGo, useRead, useRefresh } from "~/modules/page/service.ts";
import type { PlaybookView } from "~/modules/views-manager/types.ts";
import type { Said } from "./notes.tsx";
import { upper } from "./words.ts";

/** Who the playbook is of: a manager that runs, or a walk that is drafting one. */
export type Target = { readonly manager: string } | { readonly walk: string };

const initial = (view: PlaybookView): Said =>
  Object.fromEntries(
    view.comments.flatMap((c): [string, "accepted" | "dismissed"][] =>
      c.became._tag === "Change" && c.became.is !== "offered" ? [[c.id, c.became.is === "taken" ? "accepted" : "dismissed"]] : [],
    ),
  );

/** What the person does on a playbook that changes something: answering a comment, saving, making it. Each is one doing. */
export function useChanges(view: PlaybookView, target: Target) {
  const [api, refresh, go, showToast, { newId }] = [useApi(), useRefresh(), useGo(), useToast(), useBrowser()];
  const [shell, members] = [useRead("/shell"), useRead("/settings/members")];
  const [said, setSaid] = useState<Said>(() => initial(view));
  const people = members._tag === "Ok" ? members.value.people : [];
  const person = (id: string): string => people.find((one) => one.id === id)?.name ?? upper(id);
  const me = shell._tag === "Ok" ? shell.value.me : null;
  const manager = "manager" in target ? target.manager : null;
  const stale = manager === null ? [] : [`/m/${manager}/playbook`, `/m/${manager}/versions`];
  const refused = (says: string): void => void showToast({ body: says, uniqueID: "refused" });

  const doing = async (id: string, values: Readonly<Record<string, unknown>>): Promise<boolean> => {
    const did = await api.write("/do", { doing: id, values, key: newId() });
    if (did._tag === "Problem") refused(did.says);
    else if (did.value._tag === "Refused") refused(did.value.why);
    else if (did.value._tag === "Problems") refused(did.value.problems[0]?.says ?? "It cannot be done");
    else refresh(stale);
    return did._tag === "Ok" && (did.value._tag === "Done" || did.value._tag === "Asked");
  };
  return {
    said,
    me: me?.name ?? "",
    person,
    /** Answers a suggestion, or closes a comment. A draft has no manager yet: there it is only said. */
    say(id: string, v: "accepted" | "dismissed"): void {
      setSaid((s) => ({ ...s, [id]: v }));
      if (manager === null) return;
      void doing(v === "accepted" ? "suggestion.accept" : "suggestion.leave", { manager, comment: id }).then((ok) => {
        if (!ok) setSaid((s) => Object.fromEntries(Object.entries(s).filter(([key]) => key !== id)));
      });
    },
    async comment(line: string, text: string): Promise<void> {
      if (manager !== null) await doing("line.comment", { manager, line, text });
    },
    async save(): Promise<void> {
      if (manager === null) return;
      if (await doing("version.save", { manager, version: view.version + 1, files: view.files }))
        showToast({ body: `Version ${view.version + 1} is saved. Open work is told.`, uniqueID: "save" });
    },
    back(): void {
      if ("walk" in target) go(`/set-up/${target.walk}`);
    },
    async make(): Promise<void> {
      if (!("walk" in target) || me === null) return;
      const made = await api.write("/set-up/:walk", { is: "make it", by: me.id }, { walk: target.walk });
      if (made._tag === "Problem") return refused(made.says);
      if ("_tag" in made.value) return refused(made.value.why);
      const next = made.value.walk.made;
      if (next !== null) go(`/m/${next}/playbook`);
    },
  };
}
