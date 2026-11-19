import { useEffect, useRef, useState } from 'react';
import './arcana-speed.css';

/**
 * The House of Arcana's speed report, generated there by `bun run speed:report`
 * and copied to `docs/public/arcana-speed.html`. The page follows the site's
 * theme through `?theme=`, and the frame grows to the page's own height.
 */
export const ARCANA_SPEED_PAGE = '/arcana-speed.html';

/** The site's theme as the page shows it: the `dark` class on `<html>`, followed as it toggles. */
function _useSiteDark(): boolean | null {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains('dark'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export function ArcanaSpeed() {
  const dark = _useSiteDark();
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    let observer: ResizeObserver | undefined;
    // The body's own height: the root's scrollHeight never drops below the frame's, so it cannot shrink.
    const fit = () => {
      const body = iframe.contentDocument?.body;
      if (!body || !body.childElementCount) return;
      const measure = () => setHeight(Math.ceil(body.getBoundingClientRect().height));
      measure();
      observer?.disconnect();
      observer = new ResizeObserver(measure);
      observer.observe(body);
    };
    iframe.addEventListener('load', fit);
    fit();
    return () => {
      iframe.removeEventListener('load', fit);
      observer?.disconnect();
    };
  }, []);

  return (
    <section className="arcana-speed" aria-labelledby="arcana-speed-heading">
      <h2 id="arcana-speed-heading">The House of Arcana, measured</h2>
      {/* Loaded once the site's theme is known, so the frame never paints the other scheme first. */}
      <iframe ref={frame} className="arcana-speed__frame" title="The House of Arcana speed report"
        src={dark === null ? undefined : `${ARCANA_SPEED_PAGE}?theme=${dark ? 'dark' : 'light'}`}
        // A frame whose color scheme differs from its element's paints an opaque canvas; matching keeps it transparent.
        style={{ height, colorScheme: dark ? 'dark' : 'light' }} />
    </section>
  );
}
