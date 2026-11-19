import { afterEach, it, expect, vi } from "vitest";
import { configuredSupabase } from "../apps/studio/src/supabase";
afterEach(() => vi.unstubAllEnvs());
it("keeps the local runtime independent of Supabase configuration", () => {
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
  expect(configuredSupabase()).toBeNull();
});
it("rejects incomplete Supabase settings before attempting a connection", () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.org");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
  expect(() => configuredSupabase()).toThrow(
    "Configuration Supabase incomplète",
  );
});
