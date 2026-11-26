import { describe, runnable } from "./internal/describe.ts";
import { fill, found } from "./internal/found.ts";
import { copyImage, imageIn } from "./internal/image.ts";
import { domainOf, plan } from "./internal/plan.ts";
import { NEEDS, SETTINGS } from "./internal/settings.ts";
import { LIVE_IDS, type Live, type LiveId, type Settings } from "./types.ts";

export { LIVE_IDS } from "./types.ts";

const present = (settings: Settings, name: string): boolean => (settings[name] ?? "") !== "";

const missing = (id: LiveId, settings: Settings): readonly string[] => NEEDS[id].filter((name) => !present(settings, name));

export const live: Live = {
  settings: SETTINGS,
  needs: (id) => NEEDS[id],
  missing,
  skipped: (settings) => LIVE_IDS.flatMap((id) => (missing(id, settings).length === 0 ? [] : [{ id, missing: missing(id, settings) }])),
  plan,
  domain: domainOf,
  fill,
  found,
  imageIn,
  copyImage,
  describe,
  runnable,
};
