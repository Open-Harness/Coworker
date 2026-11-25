import { Banner } from "@astryxdesign/core/Banner";
import type { Loaded } from "~/modules/team-core/types.ts";
import { Page, PageSection } from "~/modules/ui/service.ts";
import type { PersonPermissions, RolesData, SetChange } from "../types.ts";
import { PersonChanges } from "./PersonChanges.tsx";
import { PresetMatrix } from "./PresetMatrix.tsx";

export interface RolesScreenProps {
  readonly roles: RolesData;
  /** Only Owners change a person's own settings. */
  readonly people?: readonly PersonPermissions[];
  readonly initialPerson?: string | undefined;
  readonly onChange: (change: SetChange) => Promise<Loaded<true>>;
}

/** What each preset may do, and, for an Owner, what each person may do over theirs. */
export function RolesScreen({ roles, people, initialPerson, onChange }: RolesScreenProps) {
  return (
    <Page
      width="wide"
      title="Roles and permissions"
      description="The same on, ask and off a manager's permissions use. Ask sends the request to an Owner's Inbox."
    >
      <PageSection title="Presets">
        <PresetMatrix roles={roles} mine={roles.mine.preset} />
      </PageSection>
      {people === undefined ? (
        <Banner status="info" title="Only an Owner changes what a person may do" />
      ) : (
        <PageSection title="Per person">
          <PersonChanges roles={roles} people={people} initialPerson={initialPerson} onChange={onChange} />
        </PageSection>
      )}
    </Page>
  );
}
