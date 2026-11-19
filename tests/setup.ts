import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { Blob, File } from "node:buffer";
import { TextEncoder as NodeTextEncoder } from "node:util";
import { webcrypto } from "node:crypto";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { repository } from "../apps/studio/src/local/repository";
Object.defineProperty(globalThis, "Blob", { value: Blob, configurable: true });
Object.defineProperty(globalThis, "File", { value: File, configurable: true });
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
// Keep encoded bytes in jsdom's realm for fflate's Uint8Array checks.
class BrowserTextEncoder extends NodeTextEncoder {
  encode(value?: string) {
    return Uint8Array.from(super.encode(value));
  }
}
Object.defineProperty(globalThis, "TextEncoder", {
  value: BrowserTextEncoder,
  configurable: true,
});
URL.createObjectURL = vi.fn(() => "blob:local-test");
URL.revokeObjectURL = vi.fn();
afterEach(async () => {
  cleanup();
  localStorage.clear();
  await repository.clearForTests();
});
