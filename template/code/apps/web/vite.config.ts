import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// `npm run dev`'s bundle half — `wrangler dev` serves `dist/` while this rebuilds it.
const watch = process.argv.includes("--watch");

// Under `--watch`, `dist/` is never emptied (see `build` below), so each rebuild deletes the files in
// `dist/assets` this bundle does not name. Files only, never a directory — removing a directory
// `wrangler dev` holds is what fails on Windows — and a file that will not go is left with a warning.
function pruneAssets(): Plugin {
  return {
    name: "{{name}}:prune-assets",
    writeBundle({ dir }, bundle) {
      const assets = join(dir!, "assets");
      for (const file of readdirSync(assets)) {
        if (`assets/${file}` in bundle) continue;
        try {
          rmSync(join(assets, file));
        } catch (error) {
          this.warn(`could not delete assets/${file}: ${(error as Error).message}`);
        }
      }
    },
  };
}

// No service worker: on dev it would serve the cached app past a lapsed Access session, whose every
// request then fails. A PWA, when the product wants one, is a story with its own decision card.
export default defineConfig({
  plugins: [react(), watch && pruneAssets()],
  build: {
    // **Do not empty `dist/` in watch mode.** `wrangler dev` serves this directory and holds files
    // open in it; on Windows the delete fails with `EPERM` and takes `npm run dev` down with it.
    emptyOutDir: !watch,
  },
  // No `server` block: the Vite dev server is not in the local topology. `wrangler dev` serves this
  // build as the Worker's static assets, exactly as the deployed Worker does.
});
