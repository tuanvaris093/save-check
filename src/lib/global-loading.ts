type Phase = "uploading" | "saving" | "redirecting";
const tasks = new Map<symbol, Phase | undefined>();
const listeners = new Set<() => void>();
let snapshot = { active: false, phase: undefined as Phase | undefined };
function publish() {
  snapshot = {
    active: tasks.size > 0,
    phase: [...tasks.values()].find((phase) => phase !== undefined),
  };
  listeners.forEach((listener) => listener());
}
export function beginGlobalLoading(phase?: Phase) {
  if (typeof window === "undefined") return () => {};
  const id = Symbol();
  tasks.set(id, phase);
  publish();
  return () => {
    if (tasks.delete(id)) publish();
  };
}
export const loadingSnapshot = () => snapshot;
const serverSnapshot = { active: false, phase: undefined as Phase | undefined };
export const loadingServerSnapshot = () => serverSnapshot;
export function subscribeLoading(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
