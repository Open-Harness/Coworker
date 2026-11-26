import type { AuthApi, ConfigApi } from "./types.ts";

export const Configs: ConfigApi = {
  config: (spec) => Object.freeze({ ...spec, kind: "config" }),
};

export const Auth: AuthApi = {
  betterAuth: (spec) => Object.freeze({
    kind: "auth", adapter: "better-auth",
    organizations: spec?.organizations ?? false, apiKeys: spec?.apiKeys ?? false,
    deviceLogin: spec?.deviceLogin ?? false, oauthProvider: spec?.oauthProvider ?? false,
  }),
};
