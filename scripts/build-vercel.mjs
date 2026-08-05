// Assembles Vercel Build Output API (v3) from TanStack Start's dist/ output.
// dist/client -> static assets, dist/server -> a Node serverless function
// wrapping the exported Web `fetch` handler.
import { cp, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, ".vercel", "output");
const staticDir = path.join(outDir, "static");
const funcDir = path.join(outDir, "functions", "index.func");

async function main() {
  if (existsSync(outDir)) await rm(outDir, { recursive: true, force: true });
  await mkdir(staticDir, { recursive: true });
  await mkdir(funcDir, { recursive: true });

  // 1) Static client assets
  await cp(path.join(root, "dist", "client"), staticDir, { recursive: true });

  // 2) Server bundle into the function directory
  await cp(path.join(root, "dist", "server"), path.join(funcDir, "server"), {
    recursive: true,
  });

  // 2b) Mark the server bundle dir as ESM. The server .js files use `export`,
  //     and the nearest package.json to them must declare type:module or Node
  //     parses them as CommonJS (SyntaxError: Unexpected token 'export').
  await writeFile(
    path.join(funcDir, "server", "package.json"),
    JSON.stringify({ type: "module" }, null, 2),
    "utf8",
  );

  // 3) Node adapter: Web fetch handler -> Node (req, res)
  const adapter = `import { Readable } from "node:stream";
import handler from "./server/server.js";

function buildRequest(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = new URL(req.url, proto + "://" + host);
  const controller = new AbortController();
  req.on("close", () => controller.abort());

  const method = req.method || "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  return new Request(url, {
    method,
    headers: req.headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
    signal: controller.signal,
  });
}

export default async function (req, res) {
  try {
    const request = buildRequest(req);
    const response = await handler.fetch(request, process.env, {});
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "content-length") return;
      res.setHeader(key, value);
    });
    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end("<h1>500</h1><p>Internal Server Error</p>");
  }
}
`;
  await writeFile(path.join(funcDir, "index.mjs"), adapter, "utf8");

  // 3b) Mark the function dir as ESM so the .js server bundle (which uses
  //     `export`) is parsed as an ES module, not CommonJS.
  await writeFile(
    path.join(funcDir, "package.json"),
    JSON.stringify({ type: "module" }, null, 2),
    "utf8",
  );

  // 4) Function config
  await writeFile(
    path.join(funcDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs22.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
        shouldAddHelpers: false,
        supportsResponseStreaming: true,
      },
      null,
      2,
    ),
    "utf8",
  );

  // 5) Top-level routing config: serve static files first, else the function
  await writeFile(
    path.join(outDir, "config.json"),
    JSON.stringify(
      {
        version: 3,
        routes: [
          {
            src: "^/assets/(.*)$",
            headers: { "cache-control": "public, max-age=31536000, immutable" },
            continue: true,
          },
          { handle: "filesystem" },
          { src: "/(.*)", dest: "/index" },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("✓ Vercel Build Output assembled at .vercel/output");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
