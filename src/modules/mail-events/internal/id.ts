/** A hash of text, the same text the same hash (cyrb53): for the mail that came without an id. */
function hash(text: string): string {
  let [h1, h2] = [0xdead_beef, 0x41c6_ce57];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2_654_435_761);
    h2 = Math.imul(h2 ^ code, 1_597_334_677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2_246_822_507) ^ Math.imul(h2 ^ (h2 >>> 13), 3_266_489_909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2_246_822_507) ^ Math.imul(h1 ^ (h1 >>> 13), 3_266_489_909);
  return (4_294_967_296 * (2_097_151 & h2) + (h1 >>> 0)).toString(36);
}

/** The name of a mail with no Message-ID: made from what it says, never from when it came in. */
export function madeId(parts: readonly string[]): string {
  return `<made-${hash(parts.join("\u0000"))}@mail-events.invalid>`;
}
