/**
 * Trigger the global top loading bar from anywhere (server actions, button clicks, etc.).
 *
 * Usage:
 *   import { startProgress, doneProgress, withProgress } from "@/lib/progress";
 *
 *   // Manual:
 *   startProgress();
 *   await doSomething();
 *   doneProgress();
 *
 *   // Wrapped:
 *   await withProgress(() => serverAction());
 */

export function startProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("progress:start"));
  }
}

export function doneProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("progress:done"));
  }
}

/** Run an async function with the progress bar shown during execution. */
export async function withProgress<T>(fn: () => Promise<T>): Promise<T> {
  startProgress();
  try {
    return await fn();
  } finally {
    doneProgress();
  }
}
