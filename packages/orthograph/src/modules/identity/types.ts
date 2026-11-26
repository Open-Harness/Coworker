// Identity: who an environment's callers are.
export interface Identity {
  readonly kind: "identity";
  /** Fixed test people with no sign-in, or Better Auth's sign-in. */
  readonly which: "test-principals" | "better-auth";
}

export interface IdentityApi {
  readonly testPrincipals: Identity;
  readonly betterAuth: Identity;
}
