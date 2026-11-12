import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const root = import.meta.dirname || process.cwd();
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json"
};

createServer(async (req, res) => {
  const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const safePath = normalize(requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, ""));
  if (safePath.startsWith("..")) { res.writeHead(403).end("Forbidden"); return; }
  try {
    const body = await readFile(join(root, safePath));
    res.writeHead(200, { "Content-Type": types[extname(safePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`ORBIT is live at http://localhost:${port}`));
