// Cloud: where an environment's state lives.
export interface Database {
  readonly kind: "database";
  /** Cloudflare D1, or the local runtime's emulation of it. */
  readonly which: "d1" | "d1-local";
}

export interface CloudProvider {
  readonly kind: "cloud";
  readonly provider: "cloudflare";
  readonly database: Database;
}

export interface CloudApi {
  readonly cloudflare: (spec: { readonly database: Database }) => CloudProvider;
  readonly d1: { (): Database; readonly local: () => Database };
}
