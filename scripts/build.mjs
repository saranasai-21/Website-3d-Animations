import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "dist");
const allowedExt = new Set([".html", ".css", ".js", ".pdf", ".svg", ".json", ".jpg", ".png"]);

await rm(outDir, { recursive: true, force: true });
await mkdir(join(outDir, "vendor", "three"), { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile()) continue;
  const name = entry.name;
  if (name === "package.json" || name === "package-lock.json" || name === "vercel.json") {
    continue;
  }
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  if (!allowedExt.has(ext)) continue;
  await cp(join(root, name), join(outDir, name));
}

if (existsSync(join(root, "assets"))) {
  await cp(join(root, "assets"), join(outDir, "assets"), { recursive: true });
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

