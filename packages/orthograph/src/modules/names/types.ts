// The framework's own names, spelled in one place (design/naming.md, rule 7): code builds them from here, so the next
// rename is this one constant plus the generated files. A project's own names (`@acme/*`) never come from here.

export interface FrameworkNames {
  /** Prose: what people read in docs, titles and messages. */
  readonly product: "Orthograph";
  /** Everything typed or matched by a program: the command, `.ortho/`, `ortho.config.ts`, `/_ortho/`, `ortho/` keys. */
  readonly short: "ortho";
  /** The npm scope of every package but the front door. */
  readonly scope: "@orthograph";
  /** The front door's package: `import { Blueprint } from "orthograph"`. */
  readonly frontDoor: "orthograph";
  /** A scoped package: `pkg("cli")` is `@orthograph/cli`. */
  readonly pkg: <const N extends string>(name: N) => `@orthograph/${N}`;
  /** An environment variable: `variable("REVISION")` is `ORTHO_REVISION`. */
  readonly variable: <const S extends string>(suffix: S) => `ORTHO_${S}`;
  /** A project's local state folder, relative to its root. */
  readonly folder: ".ortho";
  /** A project's config file, relative to its root. */
  readonly config: "ortho.config.ts";
}
