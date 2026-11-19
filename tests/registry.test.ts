import { z } from "zod";
import { describe, it, expect } from "vitest";
import { ModuleRegistry, type StudioModule } from "@sourciers/module-sdk";
import { soundscapesModule, seasonAt } from "@sourciers/soundscapes";
import { createProject, addStop } from "@sourciers/core";
describe("Module registry", () => {
  it("registers and validates all experience defaults", () => {
    const r = new ModuleRegistry().register(soundscapesModule);
    for (const d of soundscapesModule.experiences)
      expect(
        r.validate({
          moduleId: "soundscapes",
          moduleVersion: "1.0.0",
          type: d.type,
          data: d.defaults(),
        }),
      ).toBeTruthy();
  });
  it("refuses duplicate, SDK mismatch and duplicate types", () => {
    const r = new ModuleRegistry().register(soundscapesModule);
    expect(() => r.register(soundscapesModule)).toThrow();
    expect(() =>
      new ModuleRegistry().register({
        ...soundscapesModule,
        sdkVersion: "2.0.0",
      } as unknown as StudioModule),
    ).toThrow();
    expect(() =>
      new ModuleRegistry().register({
        ...soundscapesModule,
        experiences: [
          soundscapesModule.experiences[0]!,
          soundscapesModule.experiences[0]!,
        ],
      }),
    ).toThrow();
  });
  it("rejects unknown versions, types and unsafe audio", () => {
    const r = new ModuleRegistry().register(soundscapesModule);
    const e = {
      moduleId: "soundscapes",
      moduleVersion: "1.0.0",
      type: "audio",
      data: { invitation: "", url: "javascript:alert(1)", transcript: "" },
    };
    expect(() => r.validate(e)).toThrow();
    expect(() => r.resolve({ ...e, moduleVersion: "2.0.0" })).toThrow();
    expect(() => r.resolve({ ...e, type: "unknown" })).toThrow();
  });
  it("accepts an independent module without changing Core", () => {
    const definition = soundscapesModule.experiences[0]!;
    const m = {
      ...soundscapesModule,
      id: "observation",
      experiences: [{ ...definition, type: "look" }],
    };
    const r = new ModuleRegistry().register(m);
    const p = addStop(createProject());
    p.stops[0]!.experience = {
      moduleId: "observation",
      moduleVersion: "1.0.0",
      type: "look",
      data: definition.defaults(),
    };
    expect(r.validateProject(p)).toBe(p);
  });
  it("maps months to local northern-hemisphere seasons", () => {
    expect(seasonAt(new Date(2026, 0, 1))).toBe("winter");
    expect(seasonAt(new Date(2026, 2, 1))).toBe("spring");
    expect(seasonAt(new Date(2026, 6, 1))).toBe("summer");
    expect(seasonAt(new Date(2026, 10, 1))).toBe("autumn");
  });
});

it("rejects invalid defaults and incomplete seasonal payloads", () => {
  const first = soundscapesModule.experiences[0]!;
  expect(() =>
    new ModuleRegistry().register({
      ...soundscapesModule,
      experiences: [
        { ...first, defaults: () => ({ duration: -5, invitation: "" }) },
      ],
    }),
  ).toThrow();
  const registry = new ModuleRegistry().register(soundscapesModule);
  expect(() =>
    registry.validate({
      moduleId: "soundscapes",
      moduleVersion: "1.0.0",
      type: "seasonal",
      data: { invitation: "", seasons: { winter: "" }, notes: {} },
    }),
  ).toThrow();
});

it("validates independent project tools and rejects namespace collisions", () => {
  const schema = z.object({ version: z.literal("1.0.0") }).strict();
  const r = new ModuleRegistry()
    .registerProjectExtension("appearance", schema)
    .register(soundscapesModule);
  expect(
    r.validateProject({
      ...createProject(),
      extensions: { appearance: { version: "1.0.0" } },
    }),
  ).toBeTruthy();
  expect(() =>
    r.validateProject({
      ...createProject(),
      extensions: { appearance: { version: "2.0.0" } },
    }),
  ).toThrow();
  expect(() => r.registerProjectExtension("appearance", schema)).toThrow();
  expect(() => r.registerProjectExtension("soundscapes", schema)).toThrow();
  expect(() =>
    new ModuleRegistry()
      .registerProjectExtension("soundscapes", schema)
      .register(soundscapesModule),
  ).toThrow();
});
