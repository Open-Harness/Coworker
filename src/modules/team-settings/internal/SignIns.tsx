import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { Loaded } from "~/modules/team-core/types.ts";
import { PageSection } from "~/modules/ui/service.ts";
import type { SignInData } from "../types.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { DataTable } from "./DataTable.tsx";
import { seconds } from "./words.ts";

/** Where a person is signed in, and how to stop it anywhere but here. */
export function SignIns({
  signIns,
  onSignOut,
  onSignOutElsewhere,
}: {
  readonly signIns: readonly SignInData[];
  readonly onSignOut: (token: string) => Promise<unknown>;
  readonly onSignOutElsewhere: () => Promise<Loaded<true>>;
}) {
  const [isAsking, setIsAsking] = useState(false);
  return (
    <PageSection title="Where you're signed in">
      <VStack gap={4}>
        <DataTable
          stacked
          items={signIns}
          idOf={({ id }) => id}
          empty="Nowhere else"
          columns={[
            { header: "Where", cell: ({ device }) => device },
            { header: "Last active", width: 180, cell: ({ at }) => <Timestamp value={seconds(at)} format="relative" /> },
            {
              header: "",
              width: 140,
              align: "end",
              cell: ({ device, token, isThis }) =>
                isThis ? (
                  <Badge label="This one" />
                ) : (
                  <Button
                    label="Sign out"
                    size="sm"
                    variant="ghost"
                    aria-label={`Sign out of ${device}`}
                    clickAction={async () => void (await onSignOut(token))}
                  />
                ),
            },
          ]}
        />
        {signIns.some(({ isThis }) => !isThis) && (
          <HStack>
            <Button label="Sign out everywhere else" onClick={() => setIsAsking(true)} />
          </HStack>
        )}
        <ConfirmDialog
          isOpen={isAsking}
          title="Sign out everywhere else?"
          description="Every other browser and phone has to sign in again. This one stays signed in."
          actionLabel="Sign out"
          onClose={() => setIsAsking(false)}
          onConfirm={onSignOutElsewhere}
        />
      </VStack>
    </PageSection>
  );
}
