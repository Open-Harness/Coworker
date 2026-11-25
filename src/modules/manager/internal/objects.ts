import type { ManagerApi, ManagerObjects } from "../types.ts";

/** The `MANAGER` namespace, as far as this module uses it. */
export interface ManagerNamespace {
  jurisdiction(name: "eu" | "us"): {
    newUniqueId(): DurableObjectId;
    idFromString(id: string): DurableObjectId;
    get(id: DurableObjectId): ManagerApi;
  };
}

/** Each manager is made in its workspace's jurisdiction, and its data never leaves it. */
export const durableManagerObjects = (namespace: ManagerNamespace): ManagerObjects => ({
  mint: (region) => {
    const place = namespace.jurisdiction(region);
    const id = place.newUniqueId();
    return { objectId: id.toString(), object: place.get(id) };
  },
  get: (objectId, region) => {
    const place = namespace.jurisdiction(region);
    return place.get(place.idFromString(objectId));
  },
});
