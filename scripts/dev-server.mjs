import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { basename, dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 4173);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".pdf": "application/pdf"
};

createServer(async (req, res) => {
  const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const cleanRel = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const safePath = normalize(cleanRel);
  if (safePath.startsWith("..")) { res.writeHead(403).end("Forbidden"); return; }

  const isVendorThree = cleanRel.startsWith("vendor/three/");
  const targetFile = isVendorThree
    ? join(root, "node_modules", "three", "build", basename(safePath))
    : join(root, safePath);

  try {
    const body = await readFile(targetFile);
    res.writeHead(200, { "Content-Type": types[extname(targetFile)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`ORBIT is live at http://localhost:${port}`));
