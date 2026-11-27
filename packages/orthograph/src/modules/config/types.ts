// The project's one loose file, `ortho.config.ts`: its name and how people sign in. What it generates is mounted
// as projections from M1 (M1.11); the old `outputs` field was read by nothing and is gone (D3 #112, M0.03).
export interface AuthKit {
  readonly kind: "auth";
  readonly adapter: "better-auth";
  readonly organizations: boolean;
  readonly apiKeys: boolean;
  readonly deviceLogin: boolean;
  /** Agents sign in to the remote MCP server (layer two). */
  readonly oauthProvider: boolean;
}

export interface ConfigSpec {
  readonly name: string;
  readonly auth?: AuthKit;
}

export interface Config extends ConfigSpec {
  readonly kind: "config";
}

export interface ConfigApi {
  readonly config: (spec: ConfigSpec) => Config;
}

export interface AuthApi {
  readonly betterAuth: (spec?: Partial<Omit<AuthKit, "kind" | "adapter">>) => AuthKit;
}
