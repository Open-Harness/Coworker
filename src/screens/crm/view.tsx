import { Reading, useClock, useGo, useRead } from "~/modules/page/service.ts";
import { DealList } from "./list.tsx";
import { rowOf } from "./model.ts";

/** The customer's CRM as it stands: what came in, what went out. */
export default function CrmView({ manager }: { readonly manager: string }) {
  const clock = useClock();
  const go = useGo();
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return (
    <Reading from="/m/:manager/connectors/crm" parts={{ manager }} failed="We could not read the CRM">
      {(view) => (
        <DealList
          rows={view.deals.map((deal) => rowOf(deal, view, clock, zone))}
          view={view}
          onOpen={(id) => go(`/m/${manager}/connectors/crm/${id}`)}
        />
      )}
    </Reading>
  );
}
