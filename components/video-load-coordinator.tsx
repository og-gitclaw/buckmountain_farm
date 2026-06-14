"use client";

/**
 * Sequential video-load coordinator for the homepage.
 *
 * Problem: the homepage stacks several <video> sections. If every one
 * preloads on page land they all compete for bandwidth and the initial
 * paint lags. We want exactly one video downloading at a time, in
 * document order, and only once the visitor is actually approaching it.
 *
 * Model:
 *   - Each managed video registers an `order` (its position top-to-bottom).
 *   - The "active" download target is the lowest-order video that isn't
 *     `ready` yet. Only the active target may download — and only once it
 *     reports `near` (within ~1 viewport via its own IntersectionObserver).
 *   - When a video finishes buffering (`canplaythrough`, or a hard timeout
 *     so the chain can never stall), it marks itself `ready`, which
 *     advances the active target to the next video.
 *   - The hero registers as `eager`: it's always "near" and downloads
 *     immediately (it's the priority, above the fold), and reports `ready`
 *     to unblock the second video.
 *
 * Loading is decoupled from playback. This coordinator only governs WHEN
 * bytes are fetched. Each component decides WHEN to play (e.g. the
 * "Inside the room" card plays only when fully in view) and gates that on
 * the `ready` flag this hook returns, so a video never plays before its
 * bytes are in memory.
 *
 * Two contexts (api + version) on purpose: the api object has a stable
 * identity so registration effects don't churn, while the version counter
 * re-renders consumers when coordinator state changes.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

type Status = "idle" | "ready";
type Entry = { near: boolean; eager: boolean; status: Status };

type Api = {
  register: (order: number, eager: boolean) => void;
  unregister: (order: number) => void;
  setNear: (order: number, near: boolean) => void;
  setReady: (order: number) => void;
  shouldLoad: (order: number) => boolean;
  isReady: (order: number) => boolean;
};

const ApiContext = createContext<Api | null>(null);
const VersionContext = createContext(0);

export function VideoLoadProvider({ children }: { children: ReactNode }) {
  const entries = useRef<Map<number, Entry>>(new Map());
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const version = useRef(0);
  const tick = () => {
    version.current += 1;
    bump();
  };

  const api = useMemo<Api>(() => {
    const activeOrder = () => {
      let min = Number.POSITIVE_INFINITY;
      for (const [order, e] of entries.current) {
        if (e.status !== "ready" && order < min) min = order;
      }
      return min;
    };
    return {
      register(order, eager) {
        const e = entries.current.get(order);
        if (e) {
          if (eager && !e.eager) {
            e.eager = true;
            e.near = true;
          }
        } else {
          entries.current.set(order, { near: eager, eager, status: "idle" });
        }
        tick();
      },
      unregister(order) {
        if (entries.current.delete(order)) tick();
      },
      setNear(order, near) {
        const e = entries.current.get(order);
        if (!e || e.near === near) return;
        e.near = near;
        tick();
      },
      setReady(order) {
        const e = entries.current.get(order);
        if (!e || e.status === "ready") return;
        e.status = "ready";
        tick();
      },
      shouldLoad(order) {
        const e = entries.current.get(order);
        if (!e || e.status === "ready") return false;
        return order === activeOrder() && (e.eager || e.near);
      },
      isReady(order) {
        return entries.current.get(order)?.status === "ready";
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable identity for the lifetime of the provider

  return (
    <ApiContext.Provider value={api}>
      <VersionContext.Provider value={version.current}>
        {children}
      </VersionContext.Provider>
    </ApiContext.Provider>
  );
}

/**
 * Register a <video> in the sequential load chain.
 *
 * @returns `{ ready }` — true once this video's bytes are buffered (or
 *   immediately for `eager` videos / when no provider is present, so the
 *   component degrades to normal lazy behavior off the homepage).
 */
export function useSequentialVideoLoad({
  order,
  videoRef,
  eager = false,
  disabled = false,
  proximityMargin = "100% 0px",
}: {
  order: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  eager?: boolean;
  disabled?: boolean;
  proximityMargin?: string;
}): { ready: boolean } {
  const api = useContext(ApiContext);
  // Subscribe to version so this component re-renders (and recomputes
  // shouldLoad / ready) whenever coordinator state changes.
  useContext(VersionContext);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!api) return;
    api.register(order, eager);
    return () => api.unregister(order);
  }, [api, order, eager]);

  // Reduced motion: mark ready immediately so the chain advances, but never
  // download — posters stay, nothing plays.
  useEffect(() => {
    if (!api || !disabled) return;
    api.setReady(order);
  }, [api, disabled, order]);

  // Proximity: report when within ~1 viewport. Eager videos are always near.
  useEffect(() => {
    if (!api || eager || disabled) return;
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => api.setNear(order, e.isIntersecting),
      { rootMargin: proximityMargin },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [api, eager, disabled, order, proximityMargin, videoRef]);

  const shouldLoad = !disabled && !!api && api.shouldLoad(order);
  const readyFlag = !!api && api.isReady(order);

  // Begin the actual download once cleared (immediately for eager).
  useEffect(() => {
    if (disabled || !api) return;
    const el = videoRef.current;
    if (!el || startedRef.current) return;
    if (!eager && !shouldLoad) return;
    startedRef.current = true;
    if (!eager) {
      try {
        el.preload = "auto";
        el.load();
      } catch {
        /* ignore — fall through to timeout */
      }
    }
    let done = false;
    let timer = 0;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      el.removeEventListener("canplaythrough", finish);
      el.removeEventListener("error", finish);
      api.setReady(order);
    };
    // Hard cap so a stalled/oversized video can never block the chain.
    timer = window.setTimeout(finish, 12000);
    el.addEventListener("canplaythrough", finish, { once: true });
    el.addEventListener("error", finish, { once: true });
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("canplaythrough", finish);
      el.removeEventListener("error", finish);
    };
  }, [api, eager, shouldLoad, disabled, order, videoRef]);

  // Eager videos (hero) may play immediately. Off-homepage (no provider)
  // we default ready=true so the component just lazy-loads normally.
  return { ready: eager ? true : api ? readyFlag : true };
}
