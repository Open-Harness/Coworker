import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { PageSection } from "~/modules/ui/service.ts";
import type { Admission, HandleRef } from "../types.ts";
import { DataTable } from "./DataTable.tsx";
import { FormDialog } from "./FormDialog.tsx";
import { ADMISSIONS, handleWords, sameHandle, scopeWords } from "./words.ts";

/** What happens to someone who is not on the list, for each place work can come from. */
export function AdmissionTable({
  scopes,
  admission,
  canEdit,
  onChange,
}: {
  readonly scopes: readonly string[];
  readonly admission: Readonly<Record<string, Admission>>;
  readonly canEdit: boolean;
  readonly onChange: (admission: Readonly<Record<string, Admission>>) => void;
}) {
  return (
    <PageSection title="Someone not on the list">
      <DataTable
        items={scopes}
        idOf={(scope) => scope}
        empty="This manager listens nowhere yet."
        columns={[
          { header: "When it arrives by", cell: (scope) => <Text weight="medium">{scopeWords(scope)}</Text> },
          {
            header: "From someone not on the list",
            width: 300,
            cell: (scope) => (
              <Selector
                label={`Not on the list, ${scopeWords(scope)}`}
                isLabelHidden
                options={[...ADMISSIONS]}
                value={admission[scope] ?? "ignore"}
                isDisabled={!canEdit}
                onChange={(value) =>
                  ADMISSIONS.some((one) => one.value === value) && onChange({ ...admission, [scope]: value as Admission })
                }
                width="100%"
              />
            ),
          },
        ]}
      />
      <Text type="supporting">Ignored is what happens to anyone not named here. Follow-ups on a task's own thread skip this table.</Text>
    </PageSection>
  );
}

function AddBot({ onAdd, onClose }: { readonly onAdd: (bot: HandleRef) => void; readonly onClose: () => void }) {
  const [kind, setKind] = useState("github");
  const [id, setId] = useState("");
  return (
    <FormDialog
      onClose={onClose}
      title="Let a bot suggest work"
      subtitle="Its messages may become inferred candidates. Nobody else's bot does."
      submitLabel="Add bot"
      isReady={id.trim() !== ""}
      onSubmit={() => {
        onAdd({ kind, id: id.trim() });
        onClose();
      }}
    >
      <Selector label="On" options={["github", "email"]} value={kind} onChange={(value) => setKind(value ?? "github")} width="100%" />
      <TextInput label="Bot's name" placeholder="dependabot[bot]" value={id} onChange={setId} width="100%" />
    </FormDialog>
  );
}

/** The bots whose messages may become candidates. */
export function BotList({
  bots,
  canEdit,
  onChange,
}: {
  readonly bots: readonly HandleRef[];
  readonly canEdit: boolean;
  readonly onChange: (bots: readonly HandleRef[]) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  return (
    <PageSection title="Bots">
      <DataTable
        items={bots}
        idOf={handleWords}
        empty="No bot may suggest work."
        columns={[
          { header: "Bots that may suggest work", cell: (bot) => <Text weight="medium">{bot.id}</Text> },
          { header: "Where", width: 120, cell: (bot) => <Text color="secondary">{bot.kind}</Text> },
          {
            header: "",
            width: 110,
            align: "end",
            cell: (bot) => (
              <Button
                label="Remove"
                size="sm"
                variant="ghost"
                isDisabled={!canEdit}
                aria-label={`Remove bot ${bot.id}`}
                onClick={() => onChange(bots.filter((one) => !sameHandle(one, bot)))}
              />
            ),
          },
        ]}
      />
      {canEdit && (
        <HStack>
          <Button label="Add a bot" onClick={() => setIsAdding(true)} />
        </HStack>
      )}
      {isAdding && <AddBot onAdd={(bot) => onChange([...bots, bot])} onClose={() => setIsAdding(false)} />}
    </PageSection>
  );
}
