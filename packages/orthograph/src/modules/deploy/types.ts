// Deploy and publish: where each output goes. A deployment runs; a publication is installed.
export interface Deployment {
  readonly kind: "deployment";
  readonly how: "worker" | "site";
  readonly domain: string | null;
}

export type Publication =
  | { readonly kind: "publication"; readonly how: "npm"; readonly tag: string | null }
  | { readonly kind: "publication"; readonly how: "homebrew"; readonly tap: string }
  | { readonly kind: "publication"; readonly how: "binaries"; readonly on: "github-releases" };

export interface DeployApi {
  readonly worker: (spec?: { readonly domain?: string }) => Deployment;
  readonly site: (spec?: { readonly domain?: string }) => Deployment;
  readonly npm: (spec?: { readonly tag?: string }) => Publication;
  readonly homebrew: (spec: { readonly tap: string }) => Publication;
  readonly binaries: (spec: { readonly on: "github-releases" }) => Publication;
}
