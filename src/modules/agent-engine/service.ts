import { configure, defineExtension, section } from "@earendil-works/pi-durable";
import { settingsOf } from "./internal/settings.ts";
import { toolsOf } from "./internal/tools.ts";
import type { Mount } from "./types.ts";

export const mount: Mount = (kind, deps, models) => {
  const { all, skill, has } = toolsOf(kind, deps);
  const { instructions } = kind;
  const extension = defineExtension({
    name: kind.name,
    tools: [...all],
    sections: [
      ...(instructions === undefined ? [] : [section("preamble", () => instructions, { tag: false })]),
      ...(kind.sections?.(deps) ?? []),
    ],
  });
  return {
    extension,
    configure: async (tx, conversation, agent) => {
      const off = (await kind.leaveOut?.(tx)) ?? [];
      const on = new Set(has(agent));
      const remove = all.filter((tool) => !on.has(tool) || off.includes(tool.name));
      await configure(tx, conversation, { ...settingsOf(agent, models, skill?.name), extensions: [extension], tools: { remove } });
    },
  };
};
