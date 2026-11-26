/** A zip file with its entries stored, not compressed: plain to write, and any tool opens it. */
export interface ZipEntry {
  readonly path: string;
  readonly bytes: Uint8Array;
}

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** DOS date and time of a moment, which is what a zip entry carries. */
function dosTime(at: number): { readonly time: number; readonly date: number } {
  const d = new Date(Math.max(at, Date.UTC(1980, 0, 1)));
  return {
    time: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1),
    date: ((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate(),
  };
}

export function zip(entries: readonly ZipEntry[], at: number): Uint8Array {
  const { time, date } = dosTime(at);
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const { path, bytes } of entries) {
    const name = encoder.encode(path);
    const crc = crc32(bytes);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // names are UTF-8
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, bytes.length, true);
    local.setUint32(22, bytes.length, true);
    local.setUint16(26, name.length, true);
    const head = new DataView(new ArrayBuffer(46));
    head.setUint32(0, 0x02014b50, true);
    head.setUint16(4, 20, true);
    head.setUint16(6, 20, true);
    head.setUint16(8, 0x0800, true);
    head.setUint16(12, time, true);
    head.setUint16(14, date, true);
    head.setUint32(16, crc, true);
    head.setUint32(20, bytes.length, true);
    head.setUint32(24, bytes.length, true);
    head.setUint16(28, name.length, true);
    head.setUint32(42, offset, true);
    central.push(new Uint8Array(head.buffer), name);
    parts.push(new Uint8Array(local.buffer), name, bytes);
    offset += 30 + name.length + bytes.length;
  }
  const size = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
  let at2 = 0;
  for (const part of all) {
    out.set(part, at2);
    at2 += part.length;
  }
  return out;
}

/** The entries of a zip made by `zip`, for tests and for checking an export. */
export function unzip(bytes: Uint8Array): readonly ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let at = 0;
  while (view.getUint32(at, true) === 0x04034b50) {
    const [size, nameLength, extraLength] = [view.getUint32(at + 18, true), view.getUint16(at + 26, true), view.getUint16(at + 28, true)];
    const start = at + 30 + nameLength + extraLength;
    entries.push({ path: decoder.decode(bytes.subarray(at + 30, at + 30 + nameLength)), bytes: bytes.slice(start, start + size) });
    at = start + size;
  }
  return entries;
}
