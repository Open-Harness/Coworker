import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { Harness } from "@earendil-works/pi-durable";
import { ProfileDoc } from "./state.ts";

/** The workspace's address changed, so the manager's own, which is made of it, changes: where its mail comes from. */
export async function readdress(harness: Harness, address: string): Promise<void> {
  await harness.commit(async (tx) => {
    const profile = (await tx.doc(ProfileDoc)).profile;
    if (profile !== undefined) profile.address = address;
  }, BACKGROUND_CONTEXT);
}
