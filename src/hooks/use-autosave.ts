"use client";

import * as React from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave. Calls `onSave` `delay`ms after `value` last changed,
 * skipping the initial mount. Exposes a status for the UI and a `flush` to save
 * immediately (e.g. on navigation).
 */
export function useAutosave<T>(
  value: T,
  onSave: (value: T) => Promise<void>,
  delay = 900,
): { status: SaveStatus; flush: () => Promise<void> } {
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = React.useRef(value);
  const mounted = React.useRef(false);
  const onSaveRef = React.useRef(onSave);

  React.useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  React.useEffect(() => {
    latest.current = value;
  }, [value]);

  const run = React.useCallback(async (v: T) => {
    setStatus("saving");
    try {
      await onSaveRef.current(v);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(value), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  const flush = React.useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await run(latest.current);
  }, [run]);

  return { status, flush };
}
