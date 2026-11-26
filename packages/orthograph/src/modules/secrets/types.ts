// Secrets: named in an environment's file, never given a value there. The value lives in the environment.
export interface Secret {
  readonly kind: "secret";
  /** `generated` is made for each world or environment; `stored` is put there by whoever runs it. */
  readonly how: "generated" | "stored";
}

export interface SecretsApi {
  readonly secret: {
    readonly generated: () => Secret;
    readonly stored: () => Secret;
  };
}
