// Assembles Vercel Build Output API (v3) from TanStack Start's dist/ output.
//
//   dist/client  -> static assets (served directly)
//   dist/server  -> re-bundled into ONE self-contained ESM file, wrapped by a
//                   Node (req,res) adapter, and shipped as a serverless function.
//
// Why re-bundle: TanStack Start's server build is split across many .js files
// (server.js + assets/*.js) that use ESM `export`. Vercel's Node runtime loads
// the function entry as CommonJS in some cold-start paths, and nested
// package.json{type:module} markers are NOT reliably honored — producing
// "SyntaxError: Unexpected token 'export'". Collapsing everything into a single
// .mjs (which is unambiguously ESM by extension) removes every failure mode:
// no cross-file .js imports, no node_modules at runtime, no package.json
// resolution dependence.
import { cp, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { rolldown } from "rolldown";

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

  // 2) Re-bundle the server into a single self-contained ESM file.
  const bundle = await rolldown({
    input: path.join(root, "dist", "server", "server.js"),
    platform: "node",
    // node: built-ins stay external; everything else is already inlined by the
    // SSR build (ssr.noExternal), so this produces one fully self-contained file.
  });
  await bundle.write({
    file: path.join(funcDir, "server.mjs"),
    format: "esm",
    inlineDynamicImports: true, // force a single output file, no chunks
  });
  await bundle.close();

  // 3) Node adapter (also .mjs): Web fetch handler -> Node (req, res)
  const adapter = `import { Readable } from "node:stream";
import handler from "./server.mjs";

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

  // 4) Belt-and-suspenders: also declare the func dir as ESM.
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

  console.log("✓ Vercel Build Output assembled (single-file ESM server)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
