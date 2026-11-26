// astryx-template: table-page, detail-page
import { useCallback, useState } from "react";
import { DealPage } from "./detail";
import { DEALS } from "./deals";
import { DealList } from "./list";
import type { Deal } from "./data";

/** The customer's CRM as it stands, in the same plug-in shape as any connector: what came in, what went out. */
export default function CrmScreen({ manager: _manager }: { manager?: string }) {
  const [deals, setDeals] = useState<Deal[]>(DEALS);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = useCallback((id: string) => setOpenId(id), []);
  const deal = deals.find((d) => d.id === openId);
  if (!deal) return <DealList deals={deals} onOpen={open} />;
  const change = (f: (d: Deal) => Deal) => setDeals((all) => all.map((d) => (d.id === deal.id ? f(d) : d)));
  return <DealPage key={deal.id} deal={deal} change={change} onBack={() => setOpenId(null)} />;
}
