import React from "react";
import { createRoot } from "react-dom/client";
import { parseProject, type Project } from "@sourciers/core";
import { createStudioRegistry } from "../../registry";
import { ProjectPlayer } from "./Player";
import "../../../packages/design-system/src/style.css";
const registry = createStudioRegistry();
function App() {
  const [project, setProject] = React.useState<Project | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    void fetch("./project.json")
      .then((r) => {
        if (!r.ok) throw Error("Parcours absent. Importez un projet JSON.");
        return r.json() as Promise<unknown>;
      })
      .then((p) => setProject(registry.validateProject(parseProject(p))))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Projet invalide"),
      );
  }, []);
  return project ? (
    <ProjectPlayer project={project} registry={registry} />
  ) : (
    <main className="standalone">
      <h1>Sourciers Player •°</h1>
      <p role="status">{error || "Ouverture du parcours…"}</p>
      <label className="button">
        Ouvrir un projet JSON
        <input
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f)
              void f
                .text()
                .then((t) =>
                  setProject(
                    registry.validateProject(parseProject(JSON.parse(t))),
                  ),
                )
                .catch(() =>
                  setError("Fichier invalide ou module incompatible."),
                );
          }}
        />
      </label>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  void navigator.serviceWorker.register("./sw.js").catch(() => {
    /* Standalone build has no worker until published. */
  });
