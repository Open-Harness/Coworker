/* Builds the drawings. They use the app's own packages, from the repo's node_modules. */
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const store = `${root}/node_modules/.pnpm/`;
const dir = (pre, name) => `${store}${readdirSync(store).find((d) => d.startsWith(pre))}/node_modules/${name}`;
const req = createRequire(`${root}/package.json`);
const babel = req(dir("@babel+core@", "@babel/core"));
const sx = req(dir("@stylexjs+babel-plugin@", "@stylexjs/babel-plugin"));
const react = (await import(req.resolve("@vitejs/plugin-react"))).default;

const stylex = {
  name: "sx",
  enforce: "pre",
  async transform(code, id) {
    if (!id.includes("/src/screens/") || !code.includes("stylex")) return;
    const r = await babel.transformAsync(code, {
      filename: id.split("?")[0], babelrc: false, configFile: false, parserOpts: { plugins: ["typescript", "jsx"] },
      plugins: [[sx.default ?? sx, { dev: false, runtimeInjection: "@stylexjs/stylex/lib/es/inject.mjs", unstable_moduleResolution: { type: "commonJS", rootDir: root } }]],
    });
    return { code: r.code, map: null };
  },
};

export default {
  root: here,
  base: "./",
  resolve: { alias: { "@stylexjs/stylex/lib/es/inject.mjs": `${root}/node_modules/@stylexjs/stylex/lib/es/inject.mjs`, "lucide-react": dir("lucide-react@", "lucide-react") }, dedupe: ["react", "react-dom"] },
  build: { outDir: "dist", cssCodeSplit: false, chunkSizeWarningLimit: 9000, rollupOptions: { output: { inlineDynamicImports: true } } },
  server: { port: Number(process.env.PORT ?? 5310), fs: { strict: false } },
  plugins: [stylex, react()],
};
