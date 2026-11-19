import { zipSync, strToU8 } from "fflate";
import QRCode from "qrcode";
import type { Project } from "@sourciers/core";
import { assetIds } from "@sourciers/studio-tools";
import { checkedProject, type Asset } from "./repository";
export async function buildPlayerArchive(
  project: Project,
  assets: readonly Asset[],
  baseAddress: string,
  request: typeof fetch = fetch,
): Promise<Uint8Array> {
  const p = checkedProject(project);
  let address: URL | undefined;
  if (baseAddress.trim()) {
    address = new URL(baseAddress);
    if (address.protocol !== "https:" || !address.pathname.endsWith("/"))
      throw Error("Utilisez une adresse HTTPS terminée par /.");
  }
  const files: Record<string, Uint8Array> = {};
  const engine = new URL("engine/", location.href);
  const htmlResponse = await request(new URL("index.html", engine));
  if (!htmlResponse.ok)
    throw Error(
      "Le moteur d’export n’est pas disponible. Rechargez la dernière version du Studio.",
    );
  // Hosting platforms may append preview/analytics scripts to served HTML.
  // Export only the Player entry scripts from our built assets.
  const document = new DOMParser().parseFromString(
    await htmlResponse.text(),
    "text/html",
  );
  for (const script of document.querySelectorAll("script")) {
    if (
      !/^\.\/assets\/[a-z0-9_.-]+\.js$/i.test(script.getAttribute("src") ?? "")
    )
      script.remove();
  }
  const html = "<!doctype html>" + document.documentElement.outerHTML;
  const paths = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"?#]+)"/g)].map(
    (m) => m[1]!,
  );
  if (!paths.some((s) => s.endsWith(".js")))
    throw Error("Le moteur exporté est incomplet.");
  for (const path of [...new Set(paths)]) {
    const response = await request(new URL(path, engine));
    if (!response.ok) throw Error("Un fichier du Player est manquant.");
    files[path] = new Uint8Array(await response.arrayBuffer());
  }
  const media: Record<string, string> = {};
  for (const id of assetIds(p)) {
    const asset = assets.find((a) => a.id === id);
    if (!asset) throw Error("Un média local est manquant.");
    const ext =
      asset.name
        .split(".")
        .at(-1)
        ?.replace(/[^a-z0-9]/gi, "") || "bin";
    const path = "media/" + asset.id + "." + ext;
    files[path] = new Uint8Array(await asset.blob.arrayBuffer());
    media[id] = "./" + path;
  }
  files["project.json"] = strToU8(JSON.stringify(p, null, 2));
  files["media.json"] = strToU8(JSON.stringify(media));
  files["icon.svg"] = strToU8(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="#295d50"/><circle cx="96" cy="96" r="52" fill="none" stroke="white" stroke-width="8"/></svg>',
  );
  files["manifest.webmanifest"] = strToU8(
    JSON.stringify({
      name: p.title,
      short_name: p.title.slice(0, 24),
      start_url: "./",
      scope: "./",
      display: "standalone",
      background_color: "#fafbf8",
      theme_color: "#295d50",
      icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
    }),
  );
  const shell = [
    "./",
    "./index.html",
    "./project.json",
    "./media.json",
    "./icon.svg",
    "./manifest.webmanifest",
    ...paths.map((s) => "./" + s),
  ];
  const version = p.id + "-" + Date.now();
  files["sw.js"] = strToU8(
    `const CACHE=${JSON.stringify("sourciers-export-" + version)};const FILES=${JSON.stringify(shell)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sourciers-export-${p.id}-')&&k!==CACHE).map(k=>caches.delete(k))))));self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!FILES.some(f=>new URL(f,self.registration.scope).href===e.request.url))return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});`,
  );
  files["index.html"] = strToU8(
    html.replace(
      "</head>",
      '<link rel="manifest" href="./manifest.webmanifest"></head>',
    ),
  );
  if (address) {
    files["qr/accueil.svg"] = strToU8(
      await QRCode.toString(address.href, { type: "svg" }),
    );
    for (const stop of p.stops) {
      const url = new URL(address);
      url.hash = "escale=" + stop.id;
      files["qr/" + stop.id + ".svg"] = strToU8(
        await QRCode.toString(url.href, { type: "svg" }),
      );
    }
  }
  files["LIRE-MOI.txt"] = strToU8(
    "Transférez le contenu de ce dossier sur un hébergement HTTPS. Le Player utilise les contenus et médias locaux inclus. Les sons distants nécessitent le réseau. Les médias ne sont pas mis en cache hors connexion. Un fichier index.html ouvert directement depuis le gestionnaire de fichiers ne suffit pas.",
  );
  return zipSync(files, { level: 0 });
}
