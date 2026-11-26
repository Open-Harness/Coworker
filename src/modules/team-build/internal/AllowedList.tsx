import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { PageSection } from "~/modules/ui/service.ts";
import type { Allow, PersonName } from "../types.ts";
import { DataTable } from "./DataTable.tsx";
import { FormDialog } from "./FormDialog.tsx";
import { allowKey, handleWords } from "./words.ts";

type Kind = Allow["kind"];
const KINDS: readonly { readonly value: Kind; readonly label: string }[] = [
  { value: "person", label: "A person of this workspace" },
  { value: "domain", label: "An email domain" },
  { value: "handle", label: "One address or account" },
];
const HANDLE_KINDS = ["email", "github"] as const;

/** One entry to add to the list: what it is, then who. Nothing is saved until the screen is. */
function AddDialog({
  people,
  taken,
  onAdd,
  onClose,
}: {
  readonly people: readonly PersonName[];
  readonly taken: ReadonlySet<string>;
  readonly onAdd: (entry: Allow) => void;
  readonly onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>("person");
  const [person, setPerson] = useState("");
  const [domain, setDomain] = useState("");
  const [handleKind, setHandleKind] = useState<string>("email");
  const [id, setId] = useState("");
  const entry: Allow | undefined =
    kind === "person" && person !== ""
      ? { kind, person }
      : kind === "domain" && domain.trim() !== ""
        ? { kind, domain: domain.trim().replace(/^@/u, "").toLowerCase() }
        : kind === "handle" && id.trim() !== ""
          ? { kind, handle: { kind: handleKind, id: handleKind === "email" ? id.trim().toLowerCase() : id.trim() } }
          : undefined;
  const failure = entry !== undefined && taken.has(allowKey(entry)) ? "That one is on the list already" : undefined;
  return (
    <FormDialog
      onClose={onClose}
      title="Allow someone to ask"
      subtitle="What they send this manager counts as explicit."
      failure={failure}
      submitLabel="Add to the list"
      isReady={entry !== undefined && failure === undefined}
      onSubmit={() => {
        if (entry !== undefined) onAdd(entry);
        onClose();
      }}
    >
      <Selector
        label="Who"
        options={[...KINDS]}
        value={kind}
        onChange={(value) => KINDS.some((one) => one.value === value) && setKind(value as Kind)}
        width="100%"
      />
      {kind === "person" && (
        <Selector
          label="Person"
          placeholder="Pick someone"
          options={people.map(({ person: value, name }) => ({ value, label: name }))}
          value={person}
          onChange={(value) => setPerson(value ?? "")}
          width="100%"
        />
      )}
      {kind === "domain" && <TextInput label="Domain" placeholder="acme.com" value={domain} onChange={setDomain} width="100%" />}
      {kind === "handle" && (
        <>
          <Selector
            label="On"
            options={[...HANDLE_KINDS]}
            value={handleKind}
            onChange={(value) => setHandleKind(value ?? "email")}
            width="100%"
          />
          <TextInput label={handleKind === "email" ? "Email address" : "Account name"} value={id} onChange={setId} width="100%" />
        </>
      )}
    </FormDialog>
  );
}

const covers = (entry: Allow): string =>
  entry.kind === "person"
    ? "Every handle they have"
    : entry.kind === "domain"
      ? "Email, when the sender's domain passes DKIM"
      : handleWords(entry.handle);
const kindWords = (entry: Allow): string => (entry.kind === "person" ? "Person" : entry.kind === "domain" ? "Domain" : "Handle");

/** Who may ask this manager for work, from outside its own chat and board. */
export function AllowedList({
  allowed,
  people,
  canEdit,
  onChange,
}: {
  readonly allowed: readonly Allow[];
  readonly people: readonly PersonName[];
  readonly canEdit: boolean;
  readonly onChange: (allowed: readonly Allow[]) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const nameOf = (entry: Allow): string =>
    entry.kind === "person"
      ? (people.find(({ person }) => person === entry.person)?.name ?? entry.person.replace(/^email:/u, ""))
      : entry.kind === "domain"
        ? `@${entry.domain}`
        : entry.handle.id;
  return (
    <PageSection title="Who may ask">
      <DataTable
        items={allowed}
        idOf={allowKey}
        empty="Nobody yet. Only this manager's own chat and board can ask."
        columns={[
          { header: "Allowed", cell: (entry) => <Text weight="medium">{nameOf(entry)}</Text> },
          { header: "Kind", width: 100, cell: (entry) => <Text color="secondary">{kindWords(entry)}</Text> },
          { header: "It covers", cell: (entry) => <Text color="secondary">{covers(entry)}</Text> },
          {
            header: "",
            width: 110,
            align: "end",
            cell: (entry) => (
              <Button
                label="Remove"
                size="sm"
                variant="ghost"
                isDisabled={!canEdit}
                aria-label={`Remove ${nameOf(entry)}`}
                onClick={() => onChange(allowed.filter((one) => allowKey(one) !== allowKey(entry)))}
              />
            ),
          },
        ]}
      />
      <Text type="supporting">
        A person's message in this manager's own chat, or on its board, is always explicit. This list is for email, GitHub and the other
        sources.
      </Text>
      {canEdit && (
        <HStack>
          <Button label="Add someone" onClick={() => setIsAdding(true)} />
        </HStack>
      )}
      {isAdding && (
        <AddDialog
          people={people}
          taken={new Set(allowed.map(allowKey))}
          onAdd={(entry) => onChange([...allowed, entry])}
          onClose={() => setIsAdding(false)}
        />
      )}
    </PageSection>
  );
}
