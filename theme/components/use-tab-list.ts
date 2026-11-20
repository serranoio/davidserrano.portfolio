import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

/**
 * One selection over `ids`, as an ARIA tab list keeps it: arrow keys, Home and End move between tabs (and focus
 * them), and the selection is written to the URL hash as `hashOf(id)` so a link can arrive on it. On mount the hash
 * selects whichever id `fromHash` reads from it.
 */
export function useTabList<Id extends string>(options: {
  ids: readonly Id[];
  initial: Id;
  hashOf: (id: Id) => string;
  fromHash: (hash: string) => Id | undefined;
}) {
  const { ids, initial, hashOf, fromHash } = options;
  const [selected, setSelected] = useState<Id>(initial);
  const tabs = useRef<Partial<Record<Id, HTMLElement | null>>>({});

  useEffect(() => {
    const asked = fromHash(window.location.hash.slice(1));
    if (asked) setSelected(asked);
    // The hash is read once, on arrival; later selections write it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (id: Id, focus = false) => {
    setSelected(id);
    history.replaceState(history.state, '', `#${hashOf(id)}`);
    if (focus) tabs.current[id]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const at = ids.indexOf(selected);
    const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: ids.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(ids[(next + ids.length) % ids.length]!, true);
  };

  /** Props for the tab element of `id`. */
  const tabProps = (id: Id) => ({
    ref: (element: HTMLElement | null) => { tabs.current[id] = element; },
    role: 'tab' as const,
    'aria-selected': selected === id,
    tabIndex: selected === id ? 0 : -1,
    onClick: () => select(id),
  });

  return { selected, onKeyDown, tabProps };
}
