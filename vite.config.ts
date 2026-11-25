import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/** The SDK's own browser variant of the one file that needs Node: celld has neither `node:os` nor `node:child_process`. */
const anthropicWithoutNode: Plugin = {
  name: "anthropic-without-node",
  enforce: "pre",
  resolveId(source, importer) {
    if (importer?.includes("/@anthropic-ai/sdk/") !== true || !source.endsWith("/node.mjs")) return null;
    return this.resolve(source.replace(/\.mjs$/u, ".browser.mjs"), importer, { skipSelf: true });
  },
};

export default defineConfig({
  resolve: { alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [anthropicWithoutNode, cloudflare({ viteEnvironment: { name: "ssr" } }), tanstackStart(), react()],
});
