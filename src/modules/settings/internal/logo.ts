import type { By } from "~/modules/actions/types.ts";
import type { SettingsApi, SettingsPlace } from "../types.ts";
import { said } from "./said.ts";

/** A logo is a small picture. Never SVG: it can carry script, and the page would serve it from the app's own address. */
export const LOGO_LIMIT = 256 * 1024;

const starts = (bytes: Uint8Array, signature: readonly number[], at = 0): boolean =>
  signature.every((byte, index) => bytes[at + index] === byte);

/** The picture's type from its own first bytes, whatever the sender said it was. */
export function sniff(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/gif" | "image/webp" | undefined {
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts(bytes, [0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) return "image/gif";
  if (starts(bytes, [0x52, 0x49, 0x46, 0x46]) && starts(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return undefined;
}

export async function setLogo(place: SettingsPlace, input: Parameters<SettingsApi["setLogo"]>[0], by: By) {
  const { bytes } = input;
  if (bytes.byteLength > LOGO_LIMIT) return { _tag: "TooLarge", limit: LOGO_LIMIT } as const;
  const type = sniff(bytes);
  if (type === undefined) return { _tag: "WrongType" } as const;
  place.sql.exec(
    "INSERT INTO logo (only, type, bytes, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT (only) DO UPDATE SET type = excluded.type, bytes = excluded.bytes, updated_at = excluded.updated_at",
    type,
    bytes.slice().buffer,
    place.clock.now(),
  );
  said(place, by, "settings.logo", `${by.name} changed the workspace logo`);
  return { _tag: "Saved" } as const;
}

export function readLogo(place: SettingsPlace) {
  const row = place.sql.exec("SELECT type, bytes FROM logo").toArray()[0];
  const bytes = row?.["bytes"];
  if (row === undefined || !(bytes instanceof ArrayBuffer)) return { _tag: "None" } as const;
  return { _tag: "Logo", type: String(row["type"]), bytes: new Uint8Array(bytes) } as const;
}

export function removeLogo(place: SettingsPlace, by: By) {
  if (place.sql.exec("DELETE FROM logo").rowsWritten > 0) said(place, by, "settings.logo", `${by.name} removed the workspace logo`);
  return { _tag: "Removed" } as const;
}
