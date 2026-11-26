import { choosing } from "~/modules/choosing/service.ts";
import type { Limit, ModelOn, Usage } from "~/modules/choosing/types.ts";
import type { ThreadRow, WorkingDeps } from "../types.ts";
import { apply } from "./events.ts";

const TELL_AT = 0.8;

/** What a call cost, by the call: priced when its model's price is known, and counted without a price when it is not. Never as nothing. */
export function spend(
  c: WorkingDeps,
  row: ThreadRow,
  call: string,
  chosen: { readonly connection: string; readonly model: string },
  on: readonly ModelOn[],
  usage: Usage,
): { readonly over: Limit["is"] | null; readonly says: string } {
  const price = choosing.price(
    usage,
    on.find((one) => one.connection === chosen.connection && one.model === chosen.model),
  );
  c.store.addSpend({
    call,
    work: row.work,
    thread: row.id,
    connection: chosen.connection,
    model: chosen.model,
    ...usage,
    ...(price.known ? { dollars: price.dollars } : {}),
    at: c.clock.now(),
  });
  const { dollars } = c.store.spendOf(row.work);
  const work = c.store.work(row.work);
  const limits: readonly Limit[] =
    work?.mandate.limits.perWork === undefined ? [] : [{ is: "work", most: work.mandate.limits.perWork, spent: dollars, tellAt: TELL_AT }];
  const room = choosing.room(limits);
  const over = room._tag === "Over" ? room.is : null;
  apply(c, row.work, { key: `spent:${call}`, at: c.clock.now(), is: "spent", cost: dollars, over });
  return { over, says: room._tag === "Over" ? room.says : "" };
}
