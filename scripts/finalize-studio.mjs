import { readdir, readFile, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
const dir = "apps/studio/dist";
function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    size = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, crc]);
}
function icon(n) {
  const rows = Buffer.alloc((n * 4 + 1) * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - n / 2, y - n / 2);
      const light =
        Math.abs(d - n * 0.26) < n * 0.025 ||
        (x > n * 0.68 && x < n * 0.76 && y > n * 0.18 && y < n * 0.26);
      const i = y * (n * 4 + 1) + 1 + x * 4;
      rows.set(light ? [250, 251, 248, 255] : [41, 93, 80, 255], i);
    }
  const h = Buffer.alloc(13);
  h.writeUInt32BE(n, 0);
  h.writeUInt32BE(n, 4);
  h[8] = 8;
  h[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", h),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
for (const n of [192, 512]) await writeFile(`${dir}/icon-${n}.png`, icon(n));
await writeFile(
  `${dir}/manifest.webmanifest`,
  JSON.stringify({
    id: "./",
    name: "Sourciers Studio •°",
    short_name: "Sourciers",
    lang: "fr",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#fafbf8",
    theme_color: "#295d50",
    icons: [192, 512].map((n) => ({
      src: `./icon-${n}.png`,
      sizes: `${n}x${n}`,
      type: "image/png",
      purpose: "any maskable",
    })),
  }),
);
let html = await readFile(`${dir}/index.html`, "utf8");
html = html.replace(
  "</head>",
  '<link rel="manifest" href="./manifest.webmanifest"><meta name="theme-color" content="#295d50"><link rel="apple-touch-icon" href="./icon-192.png"></head>',
);
await writeFile(`${dir}/index.html`, html);
async function walk(base, prefix = "") {
  const out = [];
  for (const item of await readdir(base, { withFileTypes: true })) {
    const p = prefix + item.name;
    if (item.isDirectory())
      out.push(...(await walk(base + "/" + item.name, p + "/")));
    else out.push(p);
  }
  return out;
}
const files = (await walk(dir)).filter((p) => p !== "sw.js");
const version = createHash("sha256")
  .update(await readFile(`${dir}/index.html`))
  .digest("hex")
  .slice(0, 16);
const paths = ["./", ...files.map((p) => "./" + p)];
await writeFile(
  `${dir}/sw.js`,
  `const CACHE='sourciers-studio-${version}';const FILES=${JSON.stringify(paths)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sourciers-studio-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));return;}if(FILES.some(p=>new URL(p,self.registration.scope).href===u.href))e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});`,
);
console.log(
  "Studio PWA ready: " +
    files.length +
    " shell files; media remain in IndexedDB.",
);
