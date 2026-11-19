import { describe, it, expect } from "vitest";
import {
  createProject,
  addStop,
  removeStop,
  moveStop,
  parseProject,
  serializeProject,
  LocalProjectRepository,
} from "@sourciers/core";
describe("Core", () => {
  it("round-trips a versioned project", () => {
    const p = addStop(createProject("Parcours test"));
    expect(parseProject(JSON.parse(serializeProject(p)))).toEqual(p);
  });
  it("rejects future schemas, duplicates, malformed relationships and unknown fields", () => {
    const p = addStop(createProject());
    expect(() => parseProject({ ...p, schemaVersion: "2.0.0" })).toThrow();
    expect(() =>
      parseProject({ ...p, stops: [...p.stops, ...p.stops] }),
    ).toThrow();
    expect(() =>
      parseProject({
        ...p,
        relations: [{ from: p.id, to: p.stops[0]!.id, kind: "next" }],
      }),
    ).toThrow();
    expect(() => parseProject({ ...p, secret: "x" })).toThrow();
  });
  it("reorders safely and removes related edges", () => {
    let p = addStop(addStop(createProject(), "A"), "B");
    const [a, b] = p.stops;
    expect(moveStop(p, a!.id, -1)).toBe(p);
    p = { ...p, relations: [{ from: a!.id, to: b!.id, kind: "next" }] };
    expect(moveStop(p, b!.id, -1).stops[0]!.title).toBe("B");
    expect(removeStop(p, a!.id).relations).toHaveLength(0);
  });
  it("saves and reloads through repository contract", async () => {
    const r = new LocalProjectRepository(localStorage);
    const p = createProject();
    await r.save(p);
    expect(await r.load(p.id)).toEqual(p);
    expect(await r.load(crypto.randomUUID())).toBeNull();
  });
});
