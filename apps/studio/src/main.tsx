import React from "react";
import { createRoot } from "react-dom/client";
import { ProjectPlayer } from "../../player/src/Player";
import { builtInCreations } from "../../../creations";
import { createStudioRegistry } from "../../registry";
import { App } from "./App";
import "../../../packages/design-system/src/style.css";
import "./studio.css";
const params = new URLSearchParams(location.search);
const creation = builtInCreations.find(
  (c) => c.slug === params.get("creation"),
);
const registry = createStudioRegistry();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {params.get("view") === "player" && creation ? (
      <ProjectPlayer
        project={registry.validateProject(creation.create())}
        registry={registry}
      />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register("./sw.js").catch(() => {
    /* Local saving remains available without offline installation. */
  });
}
