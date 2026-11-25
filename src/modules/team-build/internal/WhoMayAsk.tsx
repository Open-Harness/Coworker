import { useCallback, useState } from "react";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { VStack } from "@astryxdesign/core/Layout";
import { useLoading } from "~/modules/team-core/service.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import { PageSection } from "~/modules/ui/service.ts";
import type { AcceptMode, BuildApi, PersonName, PolicyData } from "../types.ts";
import { AllowedList } from "./AllowedList.tsx";
import { AdmissionTable, BotList } from "./AdmissionBots.tsx";
import { Fetch } from "./Fetch.tsx";
import { LeaveGuard } from "./LeaveGuard.tsx";
import { SaveBar } from "./SaveBar.tsx";
import { useSave } from "./use-save.ts";
import { MODES } from "./words.ts";

const same = (one: PolicyData, other: PolicyData): boolean => JSON.stringify(one) === JSON.stringify(other);

function PolicyEditor({
  saved,
  people,
  scopes,
  canEdit,
  onSave,
}: {
  readonly saved: PolicyData;
  readonly people: readonly PersonName[];
  readonly scopes: readonly string[];
  readonly canEdit: boolean;
  readonly onSave: (policy: PolicyData) => Promise<Loaded<PolicyData>>;
}) {
  const [draft, setDraft] = useState(saved);
  const { state, run, reset } = useSave();
  const isDirty = !same(draft, saved);
  const save = async () => {
    const result = await run(() => onSave(draft));
    if (result !== undefined) setDraft(result);
  };
  return (
    <VStack gap={8}>
      <LeaveGuard isDirty={isDirty} />
      <PageSection title="When it may take work without being asked">
        <RadioList
          label="Accept mode"
          value={draft.acceptMode}
          isDisabled={!canEdit}
          onChange={(value) => setDraft({ ...draft, acceptMode: value as AcceptMode })}
        >
          {MODES.map(({ value, label, about }) => (
            <RadioListItem key={value} value={value} label={label} description={about} />
          ))}
        </RadioList>
      </PageSection>
      <AllowedList allowed={draft.allowed} people={people} canEdit={canEdit} onChange={(allowed) => setDraft({ ...draft, allowed })} />
      <AdmissionTable
        scopes={[...new Set([...scopes, ...Object.keys(draft.admission)])]}
        admission={draft.admission}
        canEdit={canEdit}
        onChange={(admission) => setDraft({ ...draft, admission })}
      />
      <BotList bots={draft.bots} canEdit={canEdit} onChange={(bots) => setDraft({ ...draft, bots })} />
      {canEdit && (
        <SaveBar
          state={state}
          isDirty={isDirty}
          label="Save who may ask"
          onSave={save}
          onDiscard={() => {
            setDraft(saved);
            reset();
          }}
        />
      )}
    </VStack>
  );
}

/** Who may ask a manager for work, and what happens to everyone else. */
export function WhoMayAsk({
  api,
  workspaceId,
  managerId,
  canEdit,
}: {
  readonly api: BuildApi;
  readonly workspaceId: string;
  readonly managerId: string;
  readonly canEdit: boolean;
}) {
  const policy = useLoading(useCallback(() => api.policy(workspaceId, managerId), [api, workspaceId, managerId]));
  const people = useLoading(useCallback(() => api.people(workspaceId), [api, workspaceId]));
  const github = useLoading(useCallback(() => api.github(workspaceId, managerId), [api, workspaceId, managerId]));
  const scopes = [
    "mailbox",
    ...(github.loaded?._tag === "Loaded"
      ? github.loaded.value.listening.flatMap(({ repo, events }) => events.map((event) => `repo:${repo}:${event}`))
      : []),
  ];
  return (
    <Fetch loading={policy} failedTitle="Who may ask did not load">
      {(saved) => (
        <PolicyEditor
          saved={saved}
          people={people.loaded?._tag === "Loaded" ? people.loaded.value : []}
          scopes={scopes}
          canEdit={canEdit}
          onSave={async (next) => {
            const result = await api.setPolicy(workspaceId, managerId, next);
            if (result._tag === "Loaded") policy.show(result.value);
            return result;
          }}
        />
      )}
    </Fetch>
  );
}
