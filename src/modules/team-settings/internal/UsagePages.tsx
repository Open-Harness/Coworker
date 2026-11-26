import { useCallback } from "react";
import { Load, useLoading } from "~/modules/team-core/service.ts";
import type { ScreenProps } from "../types.ts";
import { after } from "./after.ts";
import { BillingScreen } from "./BillingScreen.tsx";
import { UsageScreen } from "./UsageScreen.tsx";

export function UsagePage({ api, workspaceId }: ScreenProps) {
  const { loaded, reload } = useLoading(useCallback(() => api.usage(workspaceId), [api, workspaceId]));
  return (
    <Load loaded={loaded} failedTitle="Usage did not load" onRetry={reload}>
      {(usage) => (
        <UsageScreen usage={usage} onBudget={(managerId, budget) => after(api.setBudget(workspaceId, managerId, budget), reload)} />
      )}
    </Load>
  );
}

export function BillingPage({ api, workspaceId }: ScreenProps) {
  const { loaded, reload, show } = useLoading(useCallback(() => api.billing(workspaceId), [api, workspaceId]));
  return (
    <Load loaded={loaded} failedTitle="Billing did not load" onRetry={reload}>
      {(billing) => (
        <BillingScreen
          billing={billing}
          onLimit={async (on, cents) => {
            const result = await api.setLimit(workspaceId, on, cents);
            if (result._tag === "Failed") return result;
            show(result.value);
            return { _tag: "Loaded", value: true };
          }}
        />
      )}
    </Load>
  );
}
