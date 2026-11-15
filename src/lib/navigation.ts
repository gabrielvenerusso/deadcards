import { useSyncExternalStore } from "react";

const subscribe = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
export const useLocation = () => useSyncExternalStore(subscribe, () => location.pathname + location.search);

export function navigate(path: string, replace = false) {
  if (path === location.pathname + location.search) return;
  history[replace ? "replaceState" : "pushState"]({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const cardPath = (id: string) => `/carta/${encodeURIComponent(id)}`;
export const profilePath = (id: string) => `/jogador/${encodeURIComponent(id)}`;
