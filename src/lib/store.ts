import { useSyncExternalStore } from 'react';

/** A very small external store. Enough for a one-page site, no library needed. */
export function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();

  const get = () => state;
  const set = (patch: Partial<T>) => {
    let changed = false;
    for (const key in patch) {
      if (patch[key] !== state[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  function use<S>(selector: (s: T) => S): S {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(initial),
    );
  }
  return { get, set, subscribe, use };
}
