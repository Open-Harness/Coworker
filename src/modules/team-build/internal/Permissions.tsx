import { useCallback, useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { useBrowser, useLoading } from "~/modules/team-core/service.ts";
import type { BuildApi, Permission, PermissionsData, Pressed, Settings } from "../types.ts";
import { Fetch } from "./Fetch.tsx";
import { LeaveGuard } from "./LeaveGuard.tsx";
import { CategoryGroup, type Own } from "./PermissionRows.tsx";
import { SaveBar } from "./SaveBar.tsx";
import { useSave } from "./use-save.ts";

/** What changed against what is saved: a setting to put, or `null` to take away. */
function changes(draft: Settings, saved: Settings): Readonly<Record<string, Permission | null>> {
  const names = new Set([...Object.keys(draft), ...Object.keys(saved)]);
  return Object.fromEntries([...names].filter((name) => draft[name] !== saved[name]).map((name) => [name, draft[name] ?? null]));
}

const sameOwn = (one: Own, other: Own): boolean => JSON.stringify(one) === JSON.stringify(other);

/** What a manager may do: on, ask or off, per category and per action. Saving is one button press, as any person's. */
export function Permissions({
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
  const loading = useLoading(useCallback(() => api.permissions(workspaceId, managerId), [api, workspaceId, managerId]));
  const { newId } = useBrowser();
  const { state, run, reset } = useSave();
  const [waiting, setWaiting] = useState<string>();
  const [isResetting, setIsResetting] = useState(false);
  const [draft, setDraft] = useState<{ readonly of: PermissionsData; readonly own: Own }>();
  const press = (input: Readonly<Record<string, unknown>>) =>
    run(() => api.press(workspaceId, managerId, "self.permissions", input, newId()));
  const settle = (pressed: Pressed | undefined): boolean => {
    setWaiting(pressed?._tag === "Waiting" ? pressed.sentence : undefined);
    if (pressed?._tag === "Done") loading.reload();
    return pressed?._tag === "Done";
  };
  return (
    <Fetch loading={loading} failedTitle="Permissions did not load">
      {(saved) => {
        const base: Own = { categories: saved.categories, actions: saved.actions };
        const own = draft?.of === saved ? draft.own : base;
        const isDirty = !sameOwn(own, base);
        const categories = [...new Set(saved.catalogue.map((row) => row.category))];
        return (
          <VStack gap={4}>
            <LeaveGuard isDirty={isDirty} />
            <HStack gap={3} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <Text color="secondary">
                  On: the manager just does it. Ask: it waits for a person in their Inbox. Off: it can't, and says so. People's own buttons
                  are not limited here.
                </Text>
              </StackItem>
              {canEdit && <Button label="Reset to template" onClick={() => setIsResetting(true)} />}
            </HStack>
            {waiting !== undefined && (
              <Banner status="warning" title="Waiting for an Owner" description={`${waiting}. It changes once an Owner allows it.`} />
            )}
            {categories.map((category) => (
              <CategoryGroup
                key={category}
                category={category}
                rows={saved.catalogue.filter((row) => row.category === category)}
                data={saved}
                own={own}
                canEdit={canEdit}
                onChange={(next) => setDraft({ of: saved, own: next })}
              />
            ))}
            {canEdit && (
              <SaveBar
                state={state}
                isDirty={isDirty}
                label="Save permissions"
                onSave={async () => {
                  const done = settle(
                    await press({ categories: changes(own.categories, saved.categories), actions: changes(own.actions, saved.actions) }),
                  );
                  if (done) setDraft(undefined);
                }}
                onDiscard={() => {
                  setDraft(undefined);
                  reset();
                }}
              />
            )}
            <AlertDialog
              isOpen={isResetting}
              onOpenChange={setIsResetting}
              title="Go back to the template's permissions?"
              description={`Everything set here is replaced by what the ${saved.template} template starts with. This manager's history keeps what it did.`}
              actionLabel="Reset to template"
              actionVariant="destructive"
              onAction={async () => {
                settle(await press({ reset: true }));
                setDraft(undefined);
                setIsResetting(false);
              }}
            />
          </VStack>
        );
      }}
    </Fetch>
  );
}
