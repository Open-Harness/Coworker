import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import type { Loaded } from "~/modules/team-core/types.ts";
import { Page } from "~/modules/ui/service.ts";
import type { HandleData, NewHandle, PersonData } from "../types.ts";
import { DataTable } from "./DataTable.tsx";
import { HandleDialog } from "./HandleDialog.tsx";
import { HANDLE_KIND, HANDLE_PROOF, handleName, roleLabel } from "./words.ts";

function Handle({ handle }: { readonly handle: HandleData }) {
  return (
    <HStack gap={2} vAlign="center" wrap="wrap">
      <Text>{handleName(handle)}</Text>
      <Text type="supporting">{`${HANDLE_KIND[handle.kind] ?? handle.kind} · ${HANDLE_PROOF[handle.proof] ?? handle.proof}`}</Text>
    </HStack>
  );
}

/** Everyone the workspace knows, and how it recognises them when they write in. */
export function PeopleScreen({
  people,
  onAdd,
}: {
  readonly people: readonly PersonData[];
  readonly onAdd: (input: NewHandle) => Promise<Loaded<true>>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  return (
    <Page
      width="wide"
      title="People"
      description="Who your managers know, and the addresses and accounts they know them by."
      endContent={<Button label="Add a handle" variant="primary" onClick={() => setIsAdding(true)} />}
    >
      <DataTable
        stacked
        items={people}
        idOf={({ person }) => person}
        empty="Nobody yet"
        columns={[
          {
            header: "Person",
            cell: ({ name }) => (
              <HStack gap={3} vAlign="center">
                <Avatar name={name} size="md" tooltip={false} />
                <Text weight="medium">{name}</Text>
              </HStack>
            ),
          },
          {
            header: "Known as",
            cell: ({ handles }) => (
              <VStack gap={1}>
                {handles.map((handle) => (
                  <Handle key={`${handle.kind}-${handle.id}`} handle={handle} />
                ))}
              </VStack>
            ),
          },
          {
            header: "In the workspace",
            width: 170,
            cell: ({ role }) => (role === undefined ? <Text color="secondary">Not a member</Text> : <Badge label={roleLabel(role)} />),
          },
        ]}
      />
      <HandleDialog isOpen={isAdding} people={people} onClose={() => setIsAdding(false)} onAdd={onAdd} />
    </Page>
  );
}
