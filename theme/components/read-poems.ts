// The poems this visitor has already opened, kept in their browser so the
// rose and the poem list can show what is left to read. Keyed by title, which
// is stable however the petals are reassigned. Storage can be unavailable
// (private mode, blocked site data); the set then lives for this page view.
const STORAGE_KEY = 'golden-rose:read-poems';

export function loadReadPoems(): ReadonlySet<string> {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(stored) ? stored.filter((t) => typeof t === 'string') : []);
  } catch {
    return new Set();
  }
}

// Returns the set with `title` added, saving it; the same set if already read.
export function markPoemRead(read: ReadonlySet<string>, title: string): ReadonlySet<string> {
  if (read.has(title)) return read;
  const next = new Set(read).add(title);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Not remembered beyond this page view.
  }
  return next;
}
