import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { type Appearance, defaultAppearance, animationOf } from "./model";
const Context = createContext({
  appearance: defaultAppearance(),
  stopId: undefined as string | undefined,
  media: {} as Record<string, string>,
});
export function WorkshopProvider({
  appearance,
  stopId,
  media = {},
  children,
}: {
  appearance: Appearance;
  stopId?: string;
  media?: Record<string, string>;
  children: ReactNode;
}) {
  const style = {
    "--journey-primary": appearance.theme.primary,
    "--journey-ink": appearance.theme.ink,
    "--journey-paper": appearance.theme.paper,
    "--journey-surface": appearance.theme.surface,
    "--journey-accent": appearance.theme.accent,
    "--journey-radius": appearance.theme.radius + "px",
    "--journey-font":
      appearance.theme.font === "serif"
        ? "Georgia,serif"
        : "'DM Sans',sans-serif",
  } as CSSProperties;
  return (
    <Context.Provider value={{ appearance, stopId, media }}>
      <div className="journey-theme" style={style}>
        {children}
      </div>
    </Context.Provider>
  );
}
export function useWorkshop() {
  return useContext(Context);
}
export function useAnimation() {
  const { appearance, stopId } = useWorkshop();
  return animationOf(appearance, stopId);
}
export function useMediaUrl(source: string) {
  const { media } = useWorkshop();
  return source.startsWith("asset:") ? (media[source.slice(6)] ?? "") : source;
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  return reduced;
}
