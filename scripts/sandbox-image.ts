import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { live } from "../src/modules/live/service.ts";

/**
 * Puts the image sandboxes start from (the one `wrangler.jsonc` names) into Cloudflare's registry, copied from Docker Hub.
 * A step of `pnpm staging --apply`; it does nothing when the image is there. The registry password lasts an hour and
 * stays in this process.
 */
const SOURCE = "library/node";

function stop(reason: string): never {
  console.error(reason);
  process.exit(1);
}

const image = live.imageIn(readFileSync("wrangler.jsonc", "utf8"));
if (image === undefined) stop("wrangler.jsonc names no image in Cloudflare's registry.");
const asked = spawnSync(
  "pnpm",
  ["exec", "wrangler", "containers", "registries", "credentials", image.host, "--push", "--pull", "--json", "--expiration-minutes", "60"],
  {
    encoding: "utf8",
  },
);
if (asked.status !== 0) stop("Cloudflare gave no registry password. Is wrangler signed in, with Containers allowed?");
const credentials = JSON.parse(asked.stdout) as { username: string; password: string };
const copied = await live.copyImage({
  fetch: (url, init) => fetch(url, init),
  source: SOURCE,
  target: `https://${image.host}/v2/${image.repository}`,
  digest: image.digest,
  credentials,
  said: (line) => console.log(`Copying ${line}`),
});
if (copied._tag === "Failed") stop(copied.reason);
console.log(copied.blobs === 0 ? "The sandbox image is in Cloudflare's registry." : `Copied the sandbox image (${copied.blobs} parts).`);
