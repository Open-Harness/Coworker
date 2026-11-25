import { INTERNAL } from "~/modules/chat-host/service.ts";
import type { DirectoryPort } from "~/modules/chat-host/types.ts";

interface Namespace {
  getByName(name: string): { fetch(input: string, init?: RequestInit): Promise<Response> };
}

/** There is one directory. */
export const DIRECTORY_NAME = "directory";

export const createDirectoryPort = (namespace: Namespace): DirectoryPort => ({
  publish: async (projection) => {
    try {
      const response = await namespace
        .getByName(DIRECTORY_NAME)
        .fetch(`${INTERNAL}/publish`, { method: "POST", body: JSON.stringify(projection) });
      return { ok: response.ok };
    } catch {
      return { ok: false };
    }
  },
});
