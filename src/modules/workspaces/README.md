# workspaces

The control plane's workspaces. A workspace is three things kept in step: an organization in Better Auth, its
Workspace Durable Object, and the `workspace_directory` row (D1, `migrations/control/0002_workspaces.sql`) that says
which object holds it and in which region.

**Invariants**

- Created in the order organization → object → row. A failing step undoes the earlier ones, so no organization is left
  without its object.
- The address is the organization's slug and the workspace's subdomain: 3–30 lowercase letters, digits and single
  dashes, not reserved, unique. A taken one is `{ _tag: "AddressTaken" }`.
- A workspace's object is made in its region's jurisdiction (`eu` or `us`) and never moves.
- Every read of a workspace's data checks membership in D1 first, then asks that workspace's own object.
- Removing destroys the object first (it holds the data key), then the row, then the organization. Owners only.

**Testing:** `workspaces.test.ts` uses real Better Auth and real objects. `testing.ts` has `faultyObjects`, which the
fake world's composition root wraps around the real objects so a test can make the next provision fail (`faults`).

**Joining.** Owners read and change how people join (`joining`, `setInviteLinks`, `setApprovedDomains`); a link (`/join/link/<workspaceId>/<secret>`) joins as a Member after the workspace object confirms the secret (`joinByLink`); `joinByDomain` is the sign-up hook. Members are added only through Better Auth `addMember`. The approved domains are copied into the organization's `metadata.domains` as a lookup hint; the object stays the authority. An emailed invite is Better Auth's own (7 days, once, email must match, role = preset).

**General settings.** `updateGeneral` changes an Owner's name, address, time zone and default model. The name and address
are kept in the object, the directory row and the organization, so they change together: the object first, then D1, and the
object put back if D1 fails. Managers' addresses follow the workspace's. `exportData` is the Owner's zip of everything the
workspace holds (never a secret's value). `approvalFor` sends a member's waiting press to the other Owners' Inboxes.
