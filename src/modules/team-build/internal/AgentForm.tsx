import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { VStack } from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";
import { sameAgentConfig } from "~/modules/agents/service.ts";
import { BLANK_AGENT } from "~/modules/agents/types.ts";
import { teamLinks } from "~/modules/team-core/service.ts";
import type { AgentData, AgentOptions, AgentSave, BuildApi, ModelOption } from "../types.ts";
import { AgentFields } from "./AgentFields.tsx";
import { LeaveGuard, useGoOnce } from "./LeaveGuard.tsx";
import { SaveBar } from "./SaveBar.tsx";
import { useSave } from "./use-save.ts";
import { Versions } from "./Versions.tsx";

const draftOf = (agent: AgentData | undefined): AgentSave =>
  agent === undefined ? { config: BLANK_AGENT, note: "" } : { id: agent.id, config: agent.config, note: "" };

/** One agent: what it is told, what it thinks with, what it may use and where it runs. Each save is a new version. */
export function AgentForm({
  api,
  workspaceId,
  agent,
  options,
  models,
  skills,
  canEdit,
  onSaved,
  onDeleted,
}: {
  readonly api: BuildApi;
  readonly workspaceId: string;
  readonly agent: AgentData | undefined;
  readonly options: AgentOptions;
  readonly models: readonly ModelOption[];
  readonly skills: readonly string[];
  readonly canEdit: boolean;
  readonly onSaved: (agent: AgentData) => void;
  readonly onDeleted: () => void;
}) {
  const { isGoing, go } = useGoOnce();
  const [draft, setDraft] = useState(draftOf(agent));
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFailure, setDeleteFailure] = useState<string>();
  const { state, run, reset } = useSave();
  const base = draftOf(agent);
  const isDirty = !sameAgentConfig(draft.config, base.config);
  const save = async () => {
    const saved = await run(() => api.saveAgent(workspaceId, draft));
    if (saved === undefined) return;
    onSaved(saved);
    setDraft(draftOf(saved));
    if (agent === undefined) go(teamLinks.build(workspaceId, "agents", saved.id));
  };
  return (
    <VStack gap={6}>
      <LeaveGuard isDirty={isDirty && !isGoing} />
      <FormLayout>
        <AgentFields
          config={draft.config}
          onChange={(config) => setDraft({ ...draft, config })}
          isDisabled={!canEdit}
          choices={{ models, skills, environments: options.environments }}
        />
        <TextInput
          label="What changed"
          description="Shown beside this version."
          value={draft.note}
          onChange={(note) => setDraft({ ...draft, note })}
          isDisabled={!canEdit}
          isOptional
          width="100%"
        />
      </FormLayout>
      {canEdit && (
        <SaveBar
          state={state}
          isDirty={isDirty && !isGoing}
          isReady={draft.config.name.trim() !== ""}
          label={agent === undefined ? "Create agent" : `Save as v${agent.version + 1}`}
          onSave={save}
          onDiscard={() => {
            setDraft(base);
            reset();
          }}
        />
      )}
      {agent !== undefined && <Versions versions={agent.versions} />}
      {agent !== undefined && canEdit && (
        <>
          {deleteFailure !== undefined && <Banner status="error" title="The agent was not deleted" description={deleteFailure} />}
          <Banner
            status="warning"
            title="Delete this agent"
            description="Managers that use it stop being able to start it."
            endContent={<Button label="Delete agent" variant="destructive" size="sm" onClick={() => setIsDeleting(true)} />}
          />
          <AlertDialog
            isOpen={isDeleting}
            onOpenChange={setIsDeleting}
            title={`Delete ${agent.config.name}?`}
            description="Its versions go with it. This cannot be undone."
            actionLabel="Delete agent"
            actionVariant="destructive"
            onAction={async () => {
              const deleted = await api.deleteAgent(workspaceId, agent.id);
              setIsDeleting(false);
              if (deleted._tag === "Loaded") onDeleted();
              else setDeleteFailure(deleted.message);
            }}
          />
        </>
      )}
    </VStack>
  );
}
