import type { Params, ScreenRoute } from "../types.ts";

/** One screen folder's page: which folder renders it. */
export interface Entry {
  readonly folder: string;
  readonly route: ScreenRoute;
}

export interface Located {
  /** The address of the workspace, when the path is under `/ws/<address>`. */
  readonly workspace: string | null;
  /** The path under it, or the whole path outside. Always begins with `/`, never ends with one. */
  readonly rest: string;
}

export function locate(pathname: string): Located {
  const clean = pathname.replace(/\/+$/u, "") || "/";
  const inside = /^\/ws\/([^/]+)(\/.*)?$/u.exec(clean);
  return inside === null ? { workspace: null, rest: clean } : { workspace: decodeURIComponent(inside[1] ?? ""), rest: inside[2] ?? "/" };
}

const parts = (path: string): readonly string[] => path.split("/").filter((part) => part !== "");

function attempt(pattern: string, path: string): Params | undefined {
  const [have, want] = [parts(path), parts(pattern)];
  if (have.length !== want.length) return undefined;
  const found: Record<string, string> = {};
  for (const [at, part] of want.entries()) {
    const one = have[at] ?? "";
    if (part.startsWith(":")) found[part.slice(1)] = decodeURIComponent(one);
    else if (part !== one) return undefined;
  }
  return found;
}

/** The page for a path: of the ones that fit, the one with the most fixed parts. */
export function resolve(entries: readonly Entry[], where: Located): { readonly entry: Entry; readonly params: Params } | undefined {
  let best: { entry: Entry; params: Params; fixed: number } | undefined;
  for (const entry of entries) {
    if ((entry.route.outside === true) !== (where.workspace === null)) continue;
    const params = attempt(entry.route.path, where.rest);
    const fixed = parts(entry.route.path).filter((part) => !part.startsWith(":")).length;
    if (params !== undefined && (best === undefined || fixed > best.fixed)) best = { entry, params, fixed };
  }
  return best === undefined ? undefined : { entry: best.entry, params: best.params };
}

/** `/ws/acme` + `/inbox`; a path that begins with two slashes is outside any workspace. */
export function addressOf(workspace: string | null, to: string): string {
  if (to.startsWith("//")) return to.slice(1);
  if (workspace === null || /^[a-z]+:/u.test(to)) return to;
  return `/ws/${encodeURIComponent(workspace)}${to === "/" ? "" : to}`;
}

/** The screens' own folders, found by their `route.ts`. */
export function entriesOf(routes: Readonly<Record<string, ScreenRoute | readonly ScreenRoute[]>>): readonly Entry[] {
  return Object.entries(routes).flatMap(([file, found]) => {
    const folder = /screens\/([^/]+)\/route\.ts$/u.exec(file)?.[1];
    if (folder === undefined) return [];
    return (Array.isArray(found) ? (found as readonly ScreenRoute[]) : [found as ScreenRoute]).map((route) => ({ folder, route }));
  });
}
