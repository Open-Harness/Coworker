import type { Received, Raw } from "~/modules/connectors/types.ts";
import type { Heard } from "~/modules/following/types.ts";
import type { Us } from "~/modules/github-events/types.ts";

/*
 * The hearing half of the GitHub connector: a delivery in, checked, read, and made one thing that came in. The acting half
 * (`act`) is the next one's. Nothing is read from anywhere: the secret and who "us" is are given.
 */

/** What `receive` made of a delivery, and which installation it says it is for: the workspace is found by it. */
export type Delivered = Received & {
  readonly installation: number | null;
  /** An installation event that stopped the App: it was suspended (it is the same installation when it is back), not uninstalled. */
  readonly suspended?: boolean;
  /** The records the delivery carried, for what follows a conversation to keep: its item, or noise that still said something. */
  readonly heard?: Heard;
};

export interface GithubConnector {
  /**
   * Checks the signature (`x-hub-signature-256`) against `secret` before anything is read; reads the delivery for whole records;
   * and says what it is. `usFor` is asked once the signature holds, with the installation the delivery names.
   */
  readonly receive: (raw: Raw, secret: string, usFor: (installation: number | null) => Promise<Us>) => Promise<Delivered>;
}
