import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { TenantObjects } from "../types.ts";

/** The `WORKSPACE` namespace, as far as this module uses it. */
export interface TenantNamespace {
  jurisdiction(name: "eu" | "us"): {
    newUniqueId(): DurableObjectId;
    idFromString(id: string): DurableObjectId;
    get(id: DurableObjectId): WorkspaceApi;
  };
}

/** Each object is made in its workspace's jurisdiction, and its data never leaves it. */
export const durableTenantObjects = (namespace: TenantNamespace): TenantObjects => ({
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
