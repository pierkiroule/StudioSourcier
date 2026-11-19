import { cp, mkdir, rm } from "node:fs/promises";
const destination = "apps/studio/public/engine";
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp("apps/player/dist", destination, { recursive: true });
