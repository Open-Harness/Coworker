import type { Template } from "~/modules/templates/types.ts";
import type { TemplatesView } from "~/modules/views-workspace/types.ts";
import type { FillView } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { accountsOf, ok, problem } from "./around.ts";

/* Templates: ours, and the ones this workspace saved from a manager of its own. */

interface Saved {
  readonly template: Template;
  readonly from: string;
  readonly at: number;
}

export async function savedTemplates(c: ConsoleDeps): Promise<readonly Saved[]> {
  const value = await c.store.setting("templates");
  return Array.isArray(value) ? (value as Saved[]) : [];
}

export async function templatesOf(c: ConsoleDeps): Promise<readonly Template[]> {
  return [...c.ours, ...(await savedTemplates(c)).map(({ template }) => template)];
}

export async function templatesView(c: ConsoleDeps): Promise<TemplatesView> {
  const [saved, managers] = await Promise.all([savedTemplates(c), c.store.managers()]);
  const listed = [
    ...c.ours.map((template) => ({ template, saved: null })),
    ...saved.map(({ template, from, at }) => ({ template, saved: { from, at } })),
  ];
  return {
    templates: listed.map(({ template, saved: made }) => {
      const { files: _files, ...about } = template;
      return {
        ...about,
        managers: managers
          .filter(({ node }) => node.template?.id === template.id)
          .map(({ node }) => ({
            id: node.id,
            name: node.name,
            behind: (node.template?.version ?? 0) < template.version,
            on: node.template?.version ?? 0,
          })),
        saved: made,
      };
    }),
  };
}

type Pick = FillView["blanks"][number]["picks"][number];

export async function fillView(c: ConsoleDeps, id: string) {
  const template = (await templatesOf(c)).find((one) => one.id === id);
  if (template === undefined) return problem(404, `There is no template "${id}".`);
  const [accounts, connections] = await Promise.all([accountsOf(c), c.outside.connections()]);
  const picksOf = (blank: Template["blanks"][number]): readonly Pick[] => {
    if (blank.is.a === "place") {
      const connector = blank.is.connector;
      return accounts
        .filter(({ id: one }) => one === connector)
        .flatMap(({ places }) => places.map((place) => ({ id: place, about: null })));
    }
    if (blank.is.a === "person") return c.people.map(({ id: person, role }) => ({ id: person, about: role }));
    if (blank.is.a === "model")
      return [
        { id: "inherit", about: "The workspace's model" },
        ...connections
          .filter(({ check }) => check._tag === "Works")
          .flatMap((one) => one.models.map((model) => ({ id: `${one.id} ${model} low`, about: one.label }))),
      ];
    return [];
  };
  const view: FillView = {
    template: template.id,
    name: template.name,
    blanks: template.blanks.map((blank) => ({ ...blank, picks: picksOf(blank) })),
    found: null,
  };
  return ok(view);
}
