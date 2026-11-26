const OURS = "co-worker.tech";
const PRIVATE_SUFFIXES = [".localhost", ".local", ".internal"];

export function isOurs(host: string): boolean {
  return host === OURS || host.endsWith(`.${OURS}`);
}

export function isPrivateName(host: string): boolean {
  return host === "localhost" || host === "internal" || host === "local" || PRIVATE_SUFFIXES.some((s) => host.endsWith(s));
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u;

export function isPrivateV4(host: string): boolean {
  const m = IPV4.exec(host);
  if (m === null) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return a === 100 && b >= 64 && b <= 127;
}

const MAPPED = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/u;

function mappedV4(host: string): string | null {
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/u.exec(host);
  if (dotted !== null) return dotted[1] ?? null;
  const m = MAPPED.exec(host);
  if (m === null) return null;
  const hi = Number.parseInt(m[1] ?? "0", 16);
  const lo = Number.parseInt(m[2] ?? "0", 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

export function isPrivateV6(bracketed: string): boolean {
  const host = bracketed.slice(1, -1);
  if (host === "::" || host === "::1") return true;
  if (/^f[cd][0-9a-f]{2}:/u.test(host) || /^fe[89ab][0-9a-f]:/u.test(host)) return true;
  const v4 = mappedV4(host);
  return v4 !== null && isPrivateV4(v4);
}
