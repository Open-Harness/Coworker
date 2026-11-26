import { describe, expect, it } from "vitest";
import { outbox } from "~/modules/mail/testing.ts";
import type { InboxItem } from "~/modules/workspace/types.ts";
import type { CreateWorkspaceResult, JoinByLinkResult, JoiningResult, WorkspaceEntry } from "~/modules/workspaces/types.ts";
import { bindings, json, signUp, type Browser } from "../../test/flows.ts";

const DAY = 24 * 60 * 60 * 1000;

async function create(owner: Browser, address: string): Promise<WorkspaceEntry> {
  const response = await owner.send("POST", "/api/workspaces", { name: address, address, region: "eu" });
  const result = await json<CreateWorkspaceResult>(response);
  if (result._tag !== "Created") throw new Error(result._tag);
  return result.workspace;
}

const roleIn = async (person: Browser, workspaceId: string): Promise<string | undefined> => {
  const { workspaces } = await json<{ workspaces: WorkspaceEntry[] }>(await person.send("GET", "/api/workspaces"));
  return workspaces.find((entry) => entry.workspaceId === workspaceId)?.role;
};

const invite = (owner: Browser, workspaceId: string, email: string, role: string): Promise<Response> =>
  owner.send("POST", "/api/auth/organization/invite-member", { email, role, organizationId: workspaceId });

/** The invitation id the emailed link carries. */
const invitationIn = (email: string): string => /\/join\/invite\/(\S+?)(?:\s|$)/u.exec(outbox.lastTo(email)?.text ?? "")?.[1] ?? "";

const accept = (person: Browser, invitationId: string): Promise<Response> =>
  person.send("POST", "/api/auth/organization/accept-invitation", { invitationId });

const links = (owner: Browser, workspaceId: string, on: boolean) => owner.send("PUT", `/api/workspaces/${workspaceId}/join/links`, { on });

const parseLink = (path: string | undefined): { workspaceId: string; secret: string } => {
  const [, workspaceId = "", secret = ""] = /^\/join\/link\/([^/]+)\/([^/]+)$/u.exec(path ?? "") ?? [];
  return { workspaceId, secret };
};

const useLink = async (person: Browser, link: { workspaceId: string; secret: string }) => {
  const response = await person.send("POST", "/api/join/link", link);
  return { status: response.status, result: await json<JoinByLinkResult>(response) };
};

describe("joining flows", () => {
  it("flw:join/invite", async () => {
    const ada = await signUp("ada.invite@example.test", "Ada");
    const acme = await create(ada, "invite-acme");

    // An emailed invite carries the preset it was sent with.
    expect((await invite(ada, acme.workspaceId, "bo.invite@example.test", "builder")).status).toBe(200);
    const sent = outbox.lastTo("bo.invite@example.test");
    expect(sent?.text).toContain("expires in 7 days");
    const invitationId = invitationIn("bo.invite@example.test");
    expect(invitationId).not.toBe("");
    const row = await bindings.AUTH.prepare(`SELECT "createdAt", "expiresAt", "role" FROM "invitation" WHERE "id" = ?`)
      .bind(invitationId)
      .first<{ createdAt: string; expiresAt: string; role: string }>();
    expect(new Date(row?.expiresAt ?? 0).getTime() - new Date(row?.createdAt ?? 0).getTime()).toBeCloseTo(7 * DAY, -4);

    // The email must match: another account cannot use it.
    const cy = await signUp("cy.invite@example.test", "Cy");
    expect((await accept(cy, invitationId)).status).toBeGreaterThanOrEqual(400);
    expect(await roleIn(cy, acme.workspaceId)).toBeUndefined();

    // It joins with the invited preset, and works once.
    const bo = await signUp("bo.invite@example.test", "Bo");
    expect((await accept(bo, invitationId)).status).toBe(200);
    expect(await roleIn(bo, acme.workspaceId)).toBe("builder");
    expect((await accept(bo, invitationId)).status).toBeGreaterThanOrEqual(400);
    expect((await accept(cy, invitationId)).status).toBeGreaterThanOrEqual(400);

    // A different preset is carried the same way.
    expect((await invite(ada, acme.workspaceId, "di.invite@example.test", "member")).status).toBe(200);
    const diInvitation = invitationIn("di.invite@example.test");
    const di = await signUp("di.invite@example.test", "Di");
    const diAccepted = await accept(di, diInvitation);
    expect(diAccepted.status).toBe(200);
    expect(await roleIn(di, acme.workspaceId)).toBe("member");

    // After 7 days it is dead, and nothing joins.
    await invite(ada, acme.workspaceId, "ed.invite@example.test", "member");
    const late = invitationIn("ed.invite@example.test");
    const lapsed = new Date(Date.now() - DAY).toISOString();
    await bindings.AUTH.prepare(`UPDATE "invitation" SET "expiresAt" = ? WHERE "id" = ?`).bind(lapsed, late).run();
    const ed = await signUp("ed.invite@example.test", "Ed");
    expect((await accept(ed, late)).status).toBeGreaterThanOrEqual(400);
    expect(await roleIn(ed, acme.workspaceId)).toBeUndefined();
  });

  it("flw:join/link", async () => {
    const ada = await signUp("ada.link@example.test", "Ada");
    const acme = await create(ada, "link-acme");

    // Links start off. Turning them on makes a link nobody could guess.
    expect(await json<JoiningResult>(await ada.send("GET", `/api/workspaces/${acme.workspaceId}/join`))).toMatchObject({ linksOn: false });
    const on = await json<JoiningResult>(await links(ada, acme.workspaceId, true));
    const link = parseLink(on._tag === "Settings" ? on.linkPath : undefined);
    expect(link.workspaceId).toBe(acme.workspaceId);
    expect(link.secret.length).toBeGreaterThanOrEqual(32);

    // Whoever holds it joins as a Member; a wrong secret joins nothing.
    const bo = await signUp("bo.link@example.test", "Bo");
    expect((await useLink(bo, { ...link, secret: `${link.secret}x` })).status).toBe(404);
    expect(await roleIn(bo, acme.workspaceId)).toBeUndefined();
    expect(await useLink(bo, link)).toEqual({ status: 200, result: { _tag: "Joined", workspaceId: acme.workspaceId, role: "member" } });
    expect(await roleIn(bo, acme.workspaceId)).toBe("member");
    expect((await useLink(bo, link)).result).toMatchObject({ _tag: "AlreadyMember", role: "member" });

    // Only an Owner can turn links off.
    expect((await links(bo, acme.workspaceId, false)).status).toBe(403);
    expect((await links(ada, acme.workspaceId, false)).status).toBe(200);
    const cy = await signUp("cy.link@example.test", "Cy");
    expect((await useLink(cy, link)).status).toBe(404);
    expect(await roleIn(cy, acme.workspaceId)).toBeUndefined();

    // Turning them on again makes a new link; the old one stays dead.
    const again = await json<JoiningResult>(await links(ada, acme.workspaceId, true));
    const fresh = parseLink(again._tag === "Settings" ? again.linkPath : undefined);
    expect(fresh.secret).not.toBe(link.secret);
    expect((await useLink(cy, link)).status).toBe(404);
    expect((await useLink(cy, fresh)).status).toBe(200);
  });

  it("flw:join/domain", async () => {
    const ada = await signUp("ada.domain@example.test", "Ada");
    const acme = await create(ada, "domain-acme");
    const approve = (person: Browser, domains: string[]) =>
      person.send("PUT", `/api/workspaces/${acme.workspaceId}/join/domains`, { domains });

    // Only an Owner approves a domain, and only a real one.
    const early = await signUp("early@acme.com", "Early");
    expect(await roleIn(early, acme.workspaceId)).toBeUndefined();
    expect((await approve(early, ["acme.com"])).status).toBe(404);
    expect((await approve(ada, ["not a domain"])).status).toBe(400);
    expect(await json<JoiningResult>(await approve(ada, ["@ACME.com"]))).toMatchObject({ _tag: "Settings", domains: ["acme.com"] });

    // A new acme.com account joins as a Member the moment it exists; other domains do not.
    const bo = await signUp("bo@acme.com", "Bo");
    expect(await roleIn(bo, acme.workspaceId)).toBe("member");
    const cy = await signUp("cy@notacme.com", "Cy");
    expect(await roleIn(cy, acme.workspaceId)).toBeUndefined();

    // The Owner who approved it can withdraw it.
    expect((await approve(bo, [])).status).toBe(403);
    expect((await approve(ada, [])).status).toBe(200);
    const di = await signUp("di@acme.com", "Di");
    expect(await roleIn(di, acme.workspaceId)).toBeUndefined();
  });

  it("flw:join/request", async () => {
    const ada = await signUp("ada.request@example.test", "Ada");
    const acme = await create(ada, "request-acme");
    // A second Owner, by an emailed invite.
    await invite(ada, acme.workspaceId, "bo.request@example.test", "owner");
    const invitation = invitationIn("bo.request@example.test");
    const bo = await signUp("bo.request@example.test", "Bo");
    expect((await accept(bo, invitation)).status).toBe(200);
    const pending = async (owner: Browser) =>
      (await json<{ items: InboxItem[] }>(await owner.send("GET", `/api/workspaces/${acme.workspaceId}/inbox`))).items.filter(({ title }) =>
        title.endsWith("asks to join"),
      );
    const answer = (owner: Browser, itemId: string, choice: string) =>
      owner.send("POST", `/api/workspaces/${acme.workspaceId}/inbox/${encodeURIComponent(itemId)}`, { choice });

    // Without an invite, a link or an approved domain, asking puts one approval in every Owner's Inbox.
    const cy = await signUp("cy.request@elsewhere.test", "Cy");
    expect((await cy.send("POST", "/api/join/request", { address: "request-acme" })).status).toBe(202);
    expect((await json<{ _tag: string }>(await cy.send("POST", "/api/join/request", { address: "request-acme" })))._tag).toBe(
      "AlreadyRequested",
    );
    const [forAda] = await pending(ada);
    const [forBo] = await pending(bo);
    expect(forAda).toMatchObject({
      kind: "approval",
      title: "Cy (cy.request@elsewhere.test) asks to join",
      options: ["Let them in", "Say no"],
    });
    expect(forBo?.title).toBe(forAda?.title);
    expect(await roleIn(cy, acme.workspaceId)).toBeUndefined();

    // The first answer counts: Bo lets Cy in, and Ada's later no changes nothing.
    expect((await answer(bo, forBo?.id ?? "", "Let them in")).status).toBe(200);
    expect(await roleIn(cy, acme.workspaceId)).toBe("member");
    expect((await answer(ada, forAda?.id ?? "", "Say no")).status).toBe(409);
    expect((await pending(ada))[0]?.answer).toMatchObject({ decision: "allow", byName: "Bo" });
    expect(await roleIn(cy, acme.workspaceId)).toBe("member");

    // A first no keeps someone out, whatever comes after.
    const di = await signUp("di.request@elsewhere.test", "Di");
    await di.send("POST", "/api/join/request", { address: "request-acme" });
    const diFor = async (owner: Browser) => (await pending(owner)).find(({ title }) => title.startsWith("Di "));
    expect((await answer(ada, (await diFor(ada))?.id ?? "", "Say no")).status).toBe(200);
    expect((await answer(bo, (await diFor(bo))?.id ?? "", "Let them in")).status).toBe(409);
    expect(await roleIn(di, acme.workspaceId)).toBeUndefined();
    // Asking a workspace that is not there tells nobody.
    expect((await di.send("POST", "/api/join/request", { address: "no-such-place" })).status).toBe(404);
  });
});
