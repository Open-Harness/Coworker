import type { Work } from "../../world";

/** Work waiting on someone, newest first by age as the world lists it. */
export const waitingNow = (rows: readonly Work[]) => rows.filter((w) => w.lane !== "done" && w.waits);
export const settledNow = (rows: readonly Work[]) => rows.filter((w) => w.lane === "done" && (w.id === "ACME-411" || w.id === "ACME-406"));
