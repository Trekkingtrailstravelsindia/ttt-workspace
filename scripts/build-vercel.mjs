// Assembles Vercel Build Output API (v3) from TanStack Start's dist/ output.
//
//   dist/client  -> static assets (served directly)
//   dist/server  -> bundled TOGETHER WITH the Node adapter into ONE index.mjs
//                   that is the function's only entrypoint file.
//
// Why a single entrypoint: Vercel's Node runtime both (a) parsed the split
// server bundle as CommonJS on cold starts (nested package.json type:module was
// ignored -> "Unexpected token export"), and (b) failed to trace/include a
// separately-imported server.mjs ("Cannot find module server.mjs"). Bundling
// the adapter + entire server into index.mjs itself removes every failure mode:
// one file, ESM by extension, zero imports to resolve, no node_modules, no
// package.json resolution.
import { cp, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { rolldown } from "rolldown";

const root = process.cwd();
const outDir = path.join(root, ".vercel", "output");
const staticDir = path.join(outDir, "static");
const funcDir = path.join(outDir, "functions", "index.func");
const serverDir = path.join(root, "dist", "server");

async function main() {
  if (existsSync(outDir)) await rm(outDir, { recursive: true, force: true });
  await mkdir(staticDir, { recursive: true });
  await mkdir(funcDir, { recursive: true });

  // 1) Static client assets
  await cp(path.join(root, "dist", "client"), staticDir, { recursive: true });

  // 2) Write the combined entry (adapter + import of the built server handler)
  //    into dist/server/ so its relative import of ./server.js resolves during
  //    bundling. rolldown then inlines everything.
  const entrySource = `import { Readable } from "node:stream";
import handler from "./server.js";

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
  const entryPath = path.join(serverDir, "_vercel-entry.mjs");
  await writeFile(entryPath, entrySource, "utf8");

  // 3) Bundle the entry + entire server into ONE index.mjs (no chunks).
  const bundle = await rolldown({ input: entryPath, platform: "node" });
  await bundle.write({
    file: path.join(funcDir, "index.mjs"),
    format: "esm",
    codeSplitting: false,
  });
  await bundle.close();

  // 4) Declare the func dir as ESM (belt-and-suspenders; .mjs is already ESM).
  await writeFile(
    path.join(funcDir, "package.json"),
    JSON.stringify({ type: "module" }, null, 2),
    "utf8",
  );

  // 5) Function config
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

  // 6) Top-level routing: static files first, else the function
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

  console.log("✓ Vercel Build Output assembled (single-file index.mjs entry)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
