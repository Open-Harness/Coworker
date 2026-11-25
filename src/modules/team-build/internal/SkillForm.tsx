import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { teamLinks } from "~/modules/team-core/service.ts";
import { PageSection } from "~/modules/ui/service.ts";
import type { BuildApi, SkillData, SkillSave } from "../types.ts";
import { LeaveGuard, useGoOnce } from "./LeaveGuard.tsx";
import { SaveBar } from "./SaveBar.tsx";
import { useSave } from "./use-save.ts";
import { Versions } from "./Versions.tsx";

const STARTER = "---\nname: my-skill\ndescription: What it does, and when to use it.\n---\n\n# My skill\n";
const draftOf = (skill: SkillData | undefined): SkillSave =>
  skill === undefined
    ? { name: "", files: { "SKILL.md": STARTER }, note: "" }
    : { id: skill.id, name: skill.name, files: skill.files, note: "" };
const valueOf = (draft: SkillSave): string => JSON.stringify({ name: draft.name, files: draft.files });
const CHECK = { ok: "Passed", warn: "Look at this", error: "Must change" } as const;

/** A skill is a folder of files: SKILL.md says what it is for, the rest is what it needs. */
export function SkillForm({
  api,
  workspaceId,
  skill,
  canEdit,
  onSaved,
  onDeleted,
}: {
  readonly api: BuildApi;
  readonly workspaceId: string;
  readonly skill: SkillData | undefined;
  readonly canEdit: boolean;
  readonly onSaved: () => void;
  readonly onDeleted: () => void;
}) {
  const { isGoing, go } = useGoOnce();
  const [draft, setDraft] = useState(draftOf(skill));
  const [openFile, setOpenFile] = useState("SKILL.md");
  const [newFile, setNewFile] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFailure, setDeleteFailure] = useState<string>();
  const { state, run, reset } = useSave();
  const base = draftOf(skill);
  const isDirty = valueOf(draft) !== valueOf(base);
  const paths = Object.keys(draft.files).sort();
  const current = paths.includes(openFile) ? openFile : (paths[0] ?? "SKILL.md");
  const setFile = (path: string, text: string) => setDraft({ ...draft, files: { ...draft.files, [path]: text } });
  const addFile = () => {
    const path = newFile.trim();
    if (path === "" || draft.files[path] !== undefined) return;
    setFile(path, "");
    setOpenFile(path);
    setNewFile("");
  };
  const save = async () => {
    const saved = await run(() => api.saveSkill(workspaceId, draft));
    if (saved === undefined) return;
    onSaved();
    setDraft(draftOf(saved));
    if (skill === undefined) go(teamLinks.build(workspaceId, "skills", saved.id));
  };
  return (
    <VStack gap={6}>
      <LeaveGuard isDirty={isDirty && !isGoing} />
      <TextInput
        label="Name"
        description="Lowercase, and the folder's name."
        value={draft.name}
        onChange={(name) => setDraft({ ...draft, name })}
        isDisabled={!canEdit}
        width="100%"
        isRequired
      />
      <PageSection title="Files">
        <HStack gap={4} vAlign="start" wrap="wrap">
          <StackItem size="static">
            <VStack gap={2} width={220}>
              <List density="compact" hasDividers>
                {paths.map((path) => (
                  <ListItem key={path} label={path} isSelected={path === current} onClick={() => setOpenFile(path)} />
                ))}
              </List>
              {canEdit && (
                <>
                  <TextInput label="New file" placeholder="scripts/read.js" value={newFile} onChange={setNewFile} width="100%" />
                  <HStack>
                    <Button label="Add file" size="sm" isDisabled={newFile.trim() === ""} onClick={addFile} />
                  </HStack>
                </>
              )}
            </VStack>
          </StackItem>
          <StackItem size="fill">
            <VStack gap={2}>
              <TextArea
                label={current}
                rows={14}
                value={draft.files[current] ?? ""}
                onChange={(text) => setFile(current, text)}
                isDisabled={!canEdit}
                hasSpellCheck={false}
                width="100%"
              />
              {canEdit && current !== "SKILL.md" && (
                <HStack>
                  <Button
                    label="Remove this file"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDraft({ ...draft, files: Object.fromEntries(Object.entries(draft.files).filter(([path]) => path !== current)) })
                    }
                  />
                </HStack>
              )}
            </VStack>
          </StackItem>
        </HStack>
      </PageSection>
      {skill !== undefined && skill.checks.length > 0 && (
        <PageSection title="Checks">
          <List density="compact" hasDividers edge="flush">
            {skill.checks.map(({ level, text }) => (
              <ListItem key={text} label={text} endContent={<Text type="supporting">{CHECK[level]}</Text>} />
            ))}
          </List>
        </PageSection>
      )}
      <TextInput
        label="What changed"
        description="Shown beside this version."
        value={draft.note}
        onChange={(note) => setDraft({ ...draft, note })}
        isDisabled={!canEdit}
        isOptional
        width="100%"
      />
      {canEdit && (
        <SaveBar
          state={state}
          isDirty={isDirty && !isGoing}
          isReady={draft.name.trim() !== ""}
          label={skill === undefined ? "Create skill" : `Save as v${skill.version + 1}`}
          onSave={save}
          onDiscard={() => {
            setDraft(base);
            reset();
          }}
        />
      )}
      {skill !== undefined && <Versions versions={skill.versions} />}
      {skill !== undefined && canEdit && (
        <>
          {deleteFailure !== undefined && <Banner status="error" title="The skill was not deleted" description={deleteFailure} />}
          <Banner
            status="warning"
            title="Delete this skill"
            description="An agent that uses it has to drop it first."
            endContent={<Button label="Delete skill" variant="destructive" size="sm" onClick={() => setIsDeleting(true)} />}
          />
          <AlertDialog
            isOpen={isDeleting}
            onOpenChange={setIsDeleting}
            title={`Delete ${skill.name}?`}
            description="Its files and versions go with it. This cannot be undone."
            actionLabel="Delete skill"
            actionVariant="destructive"
            onAction={async () => {
              const deleted = await api.deleteSkill(workspaceId, skill.id);
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
