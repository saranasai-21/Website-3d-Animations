import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = import.meta.dirname || process.cwd();
const outDir = join(root, "dist");
const excludeFiles = new Set(["server.mjs", "build.mjs"]);
const allowedExt = new Set([".html", ".css", ".js", ".pdf", ".svg", ".json"]);

await rm(outDir, { recursive: true, force: true });
await mkdir(join(outDir, "vendor", "three"), { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile()) continue;
  const name = entry.name;
  if (excludeFiles.has(name) || name === "package.json" || name === "package-lock.json" || name === "vercel.json") {
    continue;
  }
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  if (!allowedExt.has(ext)) continue;
  await cp(join(root, name), join(outDir, name));
}

await cp(
  join(root, "node_modules", "three", "build", "three.module.min.js"),
  join(outDir, "vendor", "three", "three.module.min.js")
);
await cp(
  join(root, "node_modules", "three", "build", "three.core.min.js"),
  join(outDir, "vendor", "three", "three.core.min.js")
);

console.log("Built static bundle -> dist/");
