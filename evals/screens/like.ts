import type { Page } from "@playwright/test";

/* How alike two screens are, in what they say and in how they look. 1 is the same. */

/** What a screen reader reads, one thing a line, without addresses and empty marks. */
export function said(snapshot: string): readonly string[] {
  return snapshot
    .split("\n")
    .map((line) => line.trim().replace(/^- /u, "").replace(/ ?\[(?:ref|cursor)=[^\]]*\]/gu, "").replace(/:$/u, "").trim())
    .filter((line) => line !== "" && !line.startsWith("/url") && !["status", "separator", "rowgroup", "text"].includes(line));
}

/** The lines both have, in the same order, as a share of all. */
export function alike(ours: readonly string[], drawn: readonly string[]): { readonly share: number; readonly missing: readonly string[] } {
  const table = Array.from({ length: ours.length + 1 }, () => new Uint16Array(drawn.length + 1));
  for (let a = ours.length - 1; a >= 0; a--)
    for (let b = drawn.length - 1; b >= 0; b--) table[a]![b] = ours[a] === drawn[b] ? table[a + 1]![b + 1]! + 1 : Math.max(table[a + 1]![b]!, table[a]![b + 1]!);
  const missing: string[] = [];
  for (let a = 0, b = 0; b < drawn.length; ) {
    if (a < ours.length && ours[a] === drawn[b]) (a++, b++);
    else if (a < ours.length && table[a + 1]![b]! >= table[a]![b + 1]!) a++;
    else missing.push(drawn[b++]!);
  }
  const both = table[0]![0]!;
  return { share: drawn.length + ours.length === 0 ? 1 : (2 * both) / (ours.length + drawn.length), missing };
}

/**
 * How alike two pictures are from a step away: where there is ink, and how much. 1 is the same, near 0 is another screen.
 * `skip`: how much of the left is not looked at, the sidebar.
 */
export async function looks(blank: Page, ours: Buffer, drawn: Buffer, skip = 0): Promise<number> {
  return blank.evaluate(
    async ([a, b, left]) => {
      const BLOCK = 10;
      const ink = async (data: string): Promise<readonly number[]> => {
        const bytes = Uint8Array.from(atob(data), (letter) => letter.charCodeAt(0));
        const image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const canvas = new OffscreenCanvas(image.width - left, image.height);
        const pen = canvas.getContext("2d")!;
        pen.drawImage(image, -left, 0);
        const { data: all, width, height } = pen.getImageData(0, 0, canvas.width, canvas.height);
        const ground = [all[0]!, all[1]!, all[2]!];
        const blocks: number[] = [];
        for (let y = 0; y + BLOCK <= height; y += BLOCK)
          for (let x = 0; x + BLOCK <= width; x += BLOCK) {
            let sum = 0;
            for (let dy = 0; dy < BLOCK; dy++)
              for (let dx = 0; dx < BLOCK; dx++) {
                const at = ((y + dy) * width + x + dx) * 4;
                sum += Math.max(Math.abs(all[at]! - ground[0]!), Math.abs(all[at + 1]! - ground[1]!), Math.abs(all[at + 2]! - ground[2]!));
              }
            blocks.push(Math.sqrt(sum / (BLOCK * BLOCK)));
          }
        // A little blur, so that a line of text two points lower is still the same line.
        const across = Math.floor(width / BLOCK);
        return blocks.map((value, at) => (value * 2 + (blocks[at - 1] ?? value) + (blocks[at + 1] ?? value) + (blocks[at - across] ?? value) + (blocks[at + across] ?? value)) / 6);
      };
      const [one, two] = [await ink(a), await ink(b)];
      if (one.length !== two.length) return 0;
      const mean = (all: readonly number[]) => all.reduce((sum, value) => sum + value, 0) / all.length;
      const [m1, m2] = [mean(one), mean(two)];
      let [cross, s1, s2] = [0, 0, 0];
      for (let at = 0; at < one.length; at++) {
        cross += (one[at]! - m1) * (two[at]! - m2);
        s1 += (one[at]! - m1) ** 2;
        s2 += (two[at]! - m2) ** 2;
      }
      return s1 === 0 || s2 === 0 ? Number(s1 === s2 && Math.abs(m1 - m2) < 1) : cross / Math.sqrt(s1 * s2);
    },
    [ours.toString("base64"), drawn.toString("base64"), skip] as const,
  );
}
