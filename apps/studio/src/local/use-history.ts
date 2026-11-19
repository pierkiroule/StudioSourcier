import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@sourciers/core";
export function useProjectHistory(initial: Project) {
  const [state, setState] = useState({
    past: [] as Project[],
    present: initial,
    future: [] as Project[],
    key: "",
    at: 0,
  });
  const current = useRef(state.present);
  current.current = state.present;
  const commit = useCallback((project: Project, key = "") => {
    setState((s) => {
      if (JSON.stringify(project) === JSON.stringify(s.present)) return s;
      const coalesce = key && key === s.key && Date.now() - s.at < 700;
      return {
        past: coalesce ? s.past : [...s.past, s.present].slice(-60),
        present: {
          ...structuredClone(project),
          updatedAt: new Date().toISOString(),
        },
        future: [],
        key,
        at: Date.now(),
      };
    });
  }, []);
  const undo = useCallback(
    () =>
      setState((s) => {
        const previous = s.past.at(-1);
        return previous
          ? {
              past: s.past.slice(0, -1),
              present: previous,
              future: [s.present, ...s.future],
              key: "",
              at: 0,
            }
          : s;
      }),
    [],
  );
  const redo = useCallback(
    () =>
      setState((s) => {
        const next = s.future[0];
        return next
          ? {
              past: [...s.past, s.present],
              present: next,
              future: s.future.slice(1),
              key: "",
              at: 0,
            }
          : s;
      }),
    [],
  );
  const reset = useCallback(
    (project: Project) =>
      setState({ past: [], present: project, future: [], key: "", at: 0 }),
    [],
  );
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement;
      const typing =
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable;
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);
  return {
    project: state.present,
    commit,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    current,
  };
}
