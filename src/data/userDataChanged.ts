/**
 * Tiny pub/sub fired whenever user-authored data (notes, comments, identity, video links) is
 * written. The desktop build listens to persist that data to the library folder's project file
 * (src/desktop/projectSync.ts); on web nothing subscribes and this is a no-op.
 */
const listeners = new Set<() => void>();

export function onUserDataChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyUserDataChanged(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // A failing subscriber must never break the write that triggered it.
    }
  }
}
