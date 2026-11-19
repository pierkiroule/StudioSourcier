// Usage: pnpm publish:local -- project.json https://your-domain/path/
import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { createServer } from "vite";
const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.length !== 2)
  throw Error("Usage: pnpm publish:local -- project.json https://domain/path/");
const [input, address] = args;
const url = new URL(address);
if (url.protocol !== "https:" || !url.pathname.endsWith("/"))
  throw Error("URL HTTPS terminée par / requise");
// Reuse exactly the Studio validation through Vite SSR module loading.
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  resolve: {
    alias: {
      "@sourciers/studio-tools": resolve("packages/studio-tools/src/index.ts"),
      "@sourciers/core": resolve("packages/core/src/index.ts"),
      "@sourciers/module-sdk": resolve("packages/module-sdk/src/index.ts"),
      "@sourciers/soundscapes": resolve(
        "packages/modules/soundscapes/src/index.tsx",
      ),
      "@sourciers/media": resolve("packages/media/src/index.ts"),
      "@sourciers/design-system": resolve(
        "packages/design-system/src/index.tsx",
      ),
    },
  },
});
let project, manifest, qr;
const stopQrs = [];
try {
  const { parseProject } = await server.ssrLoadModule(
    "/packages/core/src/index.ts",
  );
  const { ModuleRegistry } = await server.ssrLoadModule(
    "/packages/module-sdk/src/index.ts",
  );
  const { soundscapesModule, soundscapesModuleV11 } =
    await server.ssrLoadModule("/packages/modules/soundscapes/src/index.tsx");
  const { AppearanceSchema, assetIds } = await server.ssrLoadModule(
    "/packages/studio-tools/src/model.ts",
  );
  project = new ModuleRegistry()
    .registerProjectExtension("appearance", AppearanceSchema)
    .register(soundscapesModule)
    .register(soundscapesModuleV11)
    .validateProject(parseProject(JSON.parse(await readFile(input, "utf8"))));
  if (assetIds(project).size)
    throw Error(
      "Ce projet contient des médias locaux : exportez la version Player depuis le Studio pour inclure les fichiers.",
    );
  const publisher = await server.ssrLoadModule(
    "/packages/publisher/src/index.ts",
  );
  manifest = publisher.createManifest(project.title);
  qr = await publisher.createQrCode(url.href);
  for (const [index, stop] of project.stops.entries()) {
    const address = new URL(url.href);
    address.hash = "escale=" + stop.id;
    stopQrs.push({
      id: stop.id,
      number: index + 1,
      title: stop.title,
      url: address.href,
      svg: await publisher.createQrCode(address.href),
    });
  }
} finally {
  await server.close();
}
const output = resolve("dist/published", project.id);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp("apps/player/dist", output, { recursive: true });
await writeFile(output + "/project.json", JSON.stringify(project, null, 2));
await writeFile(output + "/manifest.webmanifest", JSON.stringify(manifest));
for (const size of [192, 512])
  await cp(
    `packages/design-system/assets/icon-${size}.png`,
    `${output}/icon-${size}.png`,
  );
const html = await readFile(output + "/index.html", "utf8");
await writeFile(
  output + "/index.html",
  html.replace(
    "</head>",
    '<link rel="manifest" href="./manifest.webmanifest"/></head>',
  ),
);
const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"?#]+)/g)].map(
  (m) => m[1],
);
// Cache app shell + document only. Private/remote audio is intentionally never cached.
const version =
  project.id +
  "-" +
  createHash("sha256")
    .update(JSON.stringify(project) + assets.join("|"))
    .digest("hex")
    .slice(0, 12);
await writeFile(
  output + "/sw.js",
  `const CACHE=${JSON.stringify("sourciers-" + version)};const FILES=${JSON.stringify(["./", "./index.html", "./project.json", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", ...assets])};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sourciers-${project.id}-')&&k!==CACHE).map(k=>caches.delete(k))))));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!FILES.some(f=>new URL(f,self.registration.scope).href===u.href))return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});`,
);
await writeFile(output + "/qr.svg", qr);
await mkdir(output + "/qr", { recursive: true });
for (const stop of stopQrs)
  await writeFile(output + "/qr/" + stop.id + ".svg", stop.svg);
await writeFile(
  output + "/qr/index.json",
  JSON.stringify(
    stopQrs.map(({ svg, ...stop }) => stop),
    null,
    2,
  ),
);
console.log(
  "Publication statique préparée : " +
    output +
    "\nQR cible : " +
    url.href +
    "\nAucun téléversement effectué.",
);
