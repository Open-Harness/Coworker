import type { CommandBox, ManagerObject, ManagerStore, WorkspaceObject } from "./main.ts";

/** Bindings and settings of the deployment. See README.md for what each setting does. */
export interface Env {
  readonly DIRECTORY: DurableObjectNamespace;
  readonly WORKSPACES: DurableObjectNamespace;
  readonly WORKSPACE: DurableObjectNamespace<WorkspaceObject>;
  readonly MANAGER: DurableObjectNamespace<ManagerObject>;
  readonly MANAGER_STORE: DurableObjectNamespace<ManagerStore>;
  readonly AUTH: D1Database;
  readonly FILES: R2Bucket;
  readonly EMAIL: SendEmail;
  readonly VAULT_MASTER_KEY: SecretsStoreSecret;
  /** One object per container, where Cloudflare Containers are bound (staging). Without it, sandboxes are unavailable. */
  readonly BOXES?: DurableObjectNamespace<CommandBox>;
  /** `fake` builds every outside service from its fake: tests and local runs without network. */
  readonly DT_WORLD?: string;
  /** `http` with the fake world: the real adapters over the network, answered by whatever the deployment is given (the flows tier). */
  readonly DT_OUTSIDE?: string;
  /** Where the app is served. Defaults to the request's own origin. */
  readonly DT_APP_URL?: string;
  /** The address sign-in links and invites are sent from. */
  readonly DT_SEND_FROM?: string;
  /** `workspace` makes managers think with their workspace's model connection even in the fake world; the fast tier's script otherwise. */
  readonly DT_MANAGER_MODEL?: string;
  /** The domain managers' addresses are on. Defaults to `co-worker.tech`. */
  readonly DT_MAIL_DOMAIN?: string;
  /** The receiving MTA whose `Authentication-Results` decide DKIM. Cloudflare Email Routing by default. */
  readonly DT_AUTHSERV_ID?: string;
  readonly BETTER_AUTH_SECRET?: string;
  /** The id recorded with each wrapped data key. Change it with the master key. */
  readonly DT_MASTER_KEY_ID?: string;
  readonly GOOGLE_CLIENT_ID?: string;
  readonly GOOGLE_CLIENT_SECRET?: string;
  readonly GITHUB_CLIENT_ID?: string;
  readonly GITHUB_CLIENT_SECRET?: string;
  /** The GitHub App: its id, its private key (PKCS #8 PEM), its webhook secret and its slug. */
  readonly GITHUB_APP_ID?: string;
  readonly GITHUB_APP_PRIVATE_KEY?: string;
  readonly GITHUB_WEBHOOK_SECRET?: string;
  readonly GITHUB_APP_SLUG?: string;
  /** The App's own sign-in client, which proves who installed it. */
  readonly GITHUB_APP_CLIENT_ID?: string;
  readonly GITHUB_APP_CLIENT_SECRET?: string;
  readonly OPENAI_API_KEY?: string;
  readonly ANTHROPIC_API_KEY?: string;
  readonly PI_EXP_PROXY_URL?: string;
  readonly PI_EXP_PROXY_MODELS?: string;
  readonly PI_EXP_PROXY_KEY?: string;
  readonly PI_EXP_DEFAULT_MODEL?: string;
  readonly PI_EXP_FAKE_MODEL?: string;
  readonly PI_EXP_ADMINS?: string;
}
