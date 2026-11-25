import type { Account } from "~/modules/billing/types.ts";
import type { CommandRequest, Env, ExecOutcome, Sandboxes } from "~/modules/sandboxes/types.ts";

/**
 * A run's command, counted: refused when the period is at its limit, and its hours past the plan sent to billing.
 * The limit is checked before a sandbox starts, so a long command can end past it; the next one is refused.
 */
export async function meteredCommand(sandboxes: Sandboxes, account: Account, request: CommandRequest, extra?: Env): Promise<ExecOutcome> {
  const view = account.view(sandboxes.used);
  if (view.stopped) {
    const over = `$${(view.limit.overCents / 100).toFixed(0)} over plan`;
    return { _tag: "Stopped", reason: `Sandboxes are stopped at ${over} until ${new Date(view.renewsAt).toISOString().slice(0, 10)}` };
  }
  // Counted as they are recorded: commands overlap, and each second is one command's only.
  const used: { readonly seconds: number; readonly before: number }[] = [];
  const outcome = await sandboxes.exec(request, extra, (seconds) =>
    used.push({ seconds, before: sandboxes.used(view.periodStart) - seconds }),
  );
  for (const { seconds, before } of used)
    if (seconds > 0) await account.metered({ key: `${request.managerId}:${request.run}:${view.periodStart}:${before}`, seconds, before });
  return outcome;
}
