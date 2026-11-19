import { it, expect } from "vitest";
import { createQrCode, createManifest } from "@sourciers/publisher";
import { SecureMediaResolver } from "@sourciers/media";
it("generates a manifest and a real SVG QR", async () => {
  expect(createManifest("Mon parcours").scope).toBe("./");
  expect(await createQrCode("https://example.org/parcours/")).toContain("<svg");
  expect(() => createQrCode("javascript:alert(1)")).toThrow();
});
it("resolves private media only through an injected authorization service", async () => {
  const r = new SecureMediaResolver(
    async (key) => "https://example.org/" + key + "?signed=1",
  );
  expect(await r.resolve({ provider: "r2", key: "forest.mp3" })).toContain(
    "signed=1",
  );
});
