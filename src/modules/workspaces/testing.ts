import type { Region, WorkspaceApi } from "~/modules/workspace/types.ts";
import type { TenantObjects } from "./types.ts";

/** Faults a test arms in the fake world, which the composition root wraps around the real objects. */
export interface ObjectFaults {
  /** The next object to be provisioned fails as if it did not answer. */
  readonly failNextProvision: () => void;
  readonly take: () => boolean;
}

export function objectFaults(): ObjectFaults {
  let armed = false;
  return {
    failNextProvision: () => void (armed = true),
    take: () => {
      const was = armed;
      armed = false;
      return was;
    },
  };
}

/** The fake world's faults, shared by the Worker and the tests in one isolate. */
export const faults: ObjectFaults = objectFaults();

export const faultyObjects = (real: TenantObjects, armed: ObjectFaults = faults): TenantObjects => ({
  get: real.get,
  mint: (region) => {
    const minted = real.mint(region);
    if (!armed.take()) return minted;
    return {
      objectId: minted.objectId,
      object: {
        provision: () => Promise.reject(new Error("The object did not answer")),
        describe: () => minted.object.describe(),
        destroy: () => minted.object.destroy(),
        storeSecret: (name, value) => minted.object.storeSecret(name, value),
        secrets: () => minted.object.secrets(),
        addModelKey: (input) => minted.object.addModelKey(input),
        addModelEndpoint: (input) => minted.object.addModelEndpoint(input),
        modelConnections: () => minted.object.modelConnections(),
        startChatGpt: () => minted.object.startChatGpt(),
        finishChatGpt: (redirectUrl) => minted.object.finishChatGpt(redirectUrl),
        modelReadiness: () => minted.object.modelReadiness(),
        modelRoute: (wanted) => minted.object.modelRoute(wanted),
        agent: (name) => minted.object.agent(name),
        agents: () => minted.object.agents(),
        skillFile: (input) => minted.object.skillFile(input),
        modelCall: (call) => minted.object.modelCall(call),
        joinSettings: () => minted.object.joinSettings(),
        setInviteLinks: (on) => minted.object.setInviteLinks(on),
        setApprovedDomains: (domains) => minted.object.setApprovedDomains(domains),
        allowsJoin: (proof) => minted.object.allowsJoin(proof),
        requestJoin: (person, owners) => minted.object.requestJoin(person, owners),
        createManager: (input) => minted.object.createManager(input),
        managers: () => minted.object.managers(),
        recordActions: (lines) => minted.object.recordActions(lines),
        auditLog: (limit) => minted.object.auditLog(limit),
        auditQuery: (query) => minted.object.auditQuery(query),
        requestApproval: (call, approvers) => minted.object.requestApproval(call, approvers),
        settings: (call, by) => minted.object.settings(call, by),
        ask: (request) => minted.object.ask(request),
        inbox: (personId) => minted.object.inbox(personId),
        answer: (itemId, given) => minted.object.answer(itemId, given),
        receive: (trigger) => minted.object.receive(trigger),
        follow: (managerId, task, threads) => minted.object.follow(managerId, task, threads),
        logEvent: (managerId, line) => minted.object.logEvent(managerId, line),
        events: (managerId, limit) => minted.object.events(managerId, limit),
        policy: (managerId) => minted.object.policy(managerId),
        addHandle: (person, handle) => minted.object.addHandle(person, handle),
        people: () => minted.object.people(),
        connectGitHub: (installation) => minted.object.connectGitHub(installation),
        gitHub: () => minted.object.gitHub(),
        gitHubLost: () => minted.object.gitHubLost(),
        setRepoSources: (managerId, sources) => minted.object.setRepoSources(managerId, sources),
        gitHubRemoved: (installation, owners) => minted.object.gitHubRemoved(installation, owners),
        gitHubBack: (installation, us) => minted.object.gitHubBack(installation, us),
        setPolicy: (managerId, policy) => minted.object.setPolicy(managerId, policy),
        environments: () => minted.object.environments(),
        saveEnvironment: (input) => minted.object.saveEnvironment(input),
        sandbox: (request) => minted.object.sandbox(request),
        billing: () => minted.object.billing(),
        setSpendLimit: (limit) => minted.object.setSpendLimit(limit),
        membersChanged: (members) => minted.object.membersChanged(members),
        tick: () => minted.object.tick(),
        consoleStore: (op) => minted.object.consoleStore(op),
        asked: (op) => minted.object.asked(op),
      },
    };
  },
});

/** The plain namespace workerd gives a test, which has no jurisdictions. */
export interface PlainNamespace<T = WorkspaceApi> {
  newUniqueId(): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): T;
}

/** A namespace with jurisdictions, for objects of any class. */
export interface Jurisdictions<T> {
  jurisdiction(name: Region): { newUniqueId(): DurableObjectId; idFromString(id: string): DurableObjectId; get(id: DurableObjectId): T };
}

/** Where each object was made, for the fake world's jurisdictions. Shared by the Worker and the tests in one isolate. */
export const placements = new Map<string, Region>();

/**
 * Jurisdictions as Cloudflare keeps them, over a namespace that has none: each id remembers its region, and asking
 * for it from another region fails as it does on the platform.
 */
export const localJurisdictions = <T = WorkspaceApi>(
  namespace: PlainNamespace<T>,
  placed: Map<string, Region> = placements,
): Jurisdictions<T> => ({
  jurisdiction: (region) => ({
    newUniqueId: () => {
      const id = namespace.newUniqueId();
      placed.set(id.toString(), region);
      return id;
    },
    idFromString: (id) => {
      // An id this isolate never saw was made by another one (a local run has several); only a known mismatch fails.
      const known = placed.get(id);
      if (known !== undefined && known !== region) throw new Error(`Object ${id} is not in the ${region} jurisdiction`);
      return namespace.idFromString(id);
    },
    get: (id) => namespace.get(id),
  }),
});
