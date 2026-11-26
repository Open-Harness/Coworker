/** An id made from a key, so that doing the same thing again finds what it made: `th_` plus sixteen hex digits. */
export function idOf(prefix: string, key: string): string {
  let [one, two] = [0x811c9dc5, 0x1b873593];
  for (const char of key) {
    one = Math.imul(one ^ char.charCodeAt(0), 0x01000193) >>> 0;
    two = Math.imul(two + char.charCodeAt(0), 0x85ebca6b) >>> 0;
  }
  return `${prefix}_${one.toString(16).padStart(8, "0")}${two.toString(16).padStart(8, "0")}`;
}
