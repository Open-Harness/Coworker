/** One practice repo with something wrong in it that is known. All of them run with node alone: nothing is installed. */
export interface Job {
  readonly id: string;
  readonly files: Readonly<Record<string, string>>;
  readonly issue: { readonly title: string; readonly body: string };
  /** Laid over the branch it made, and run there. Never in the repo, so nothing can be written to fit it. */
  readonly hidden: Readonly<Record<string, string>>;
  readonly test: string;
  /** Files that must be as they were. */
  readonly untouched?: readonly string[];
}

export const PACKAGE = '{"name":"practice","private":true,"type":"module","scripts":{"test":"node --test"}}\n';
export const AGENTS = "# For whoever works here\n\nNode 24, nothing installed. Run the tests with `node --test`. A fix comes with a test that fails without it.\nChange no more than the issue needs.\n";
