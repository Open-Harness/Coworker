import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { SecretData } from "../types.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { DataTable } from "./DataTable.tsx";
import { seconds } from "./words.ts";

/** The names in the vault, never their values. Taking one away asks first and says which setups named it. */
export function SecretsList({
  secrets,
  onRemove,
}: {
  readonly secrets: readonly SecretData[];
  readonly onRemove: (name: string) => Promise<Loaded<readonly string[]>>;
}) {
  const [removing, setRemoving] = useState<string>();
  return (
    <>
      <DataTable
        stacked
        items={secrets}
        idOf={({ name }) => name}
        empty="No secrets in the vault"
        columns={[
          { header: "Name", cell: ({ name }) => <Code>{name}</Code> },
          {
            header: "Last set",
            width: 160,
            cell: ({ updatedAt }) =>
              updatedAt === 0 ? <Text color="secondary">—</Text> : <Timestamp value={seconds(updatedAt)} format="relative" />,
          },
          {
            header: "",
            width: 120,
            align: "end",
            cell: ({ name }) => (
              <Button label="Remove" size="sm" variant="ghost" aria-label={`Remove the secret ${name}`} onClick={() => setRemoving(name)} />
            ),
          },
        ]}
      />
      <ConfirmDialog
        isOpen={removing !== undefined}
        title={`Remove the secret ${removing ?? ""}?`}
        description="A setup script that names it as vault:name will no longer get a value. The value cannot be brought back."
        actionLabel="Remove secret"
        onClose={() => setRemoving(undefined)}
        onConfirm={async () => (removing === undefined ? { _tag: "Loaded", value: [] } : onRemove(removing))}
      />
    </>
  );
}
