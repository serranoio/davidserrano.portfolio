import './index.css';
// Import to register the custom elements (side-effect imports).
import './components/welcome-section';
import './components/golden-rose';
// import './components/case-studies-section'; // Hidden until real case studies exist
import './components/writing-section';
import './components/music-player';
import { createElement, useEffect } from 'react';

// Music player lives at the body level so it survives rspress page nav and
// keeps playing across routes. Mount exactly one instance.
if (typeof document !== 'undefined') {
  const mountMusicPlayer = () => {
    if (!document.querySelector('music-player')) {
      document.body.appendChild(document.createElement('music-player'));
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountMusicPlayer);
  } else {
    mountMusicPlayer();
  }
}

// Re-export everything from the original theme
export * from '@rspress/core/theme-original';

// Home page composes top-level sections vertically. Each section is its
// own Lit element so they can own their own DOM, lifecycle, and styles
// without leaking into siblings. The explicit wrapper guarantees rspress's
// home container can't squash the rose's native scroll distance.
export function HomeLayout() {
  useEffect(() => {
    if (window.location.hash !== '#rose') return;
    let cancelled = false;
    let frame = 0;
    // Cross-page hash navigation runs before Lit and fonts establish the hero's
    // height. Restore the destination after layout and the router's scroll reset.
    void Promise.all([
      document.querySelector('welcome-section')?.updateComplete,
      document.querySelector('golden-rose')?.updateComplete,
      document.fonts.ready,
    ]).then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        const rose = document.getElementById('rose');
        rose?.scrollIntoView({ block: 'start', behavior: 'instant' });
        rose?.setAttribute('tabindex', '-1');
        rose?.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '100dvh',
      },
    },
    createElement('welcome-section', { id: 'welcome' }),
    createElement('golden-rose', { id: 'rose' }),
    createElement('writing-section', { id: 'writing' })
  );
}

// TypeScript: declare custom elements for JSX
type CustomElement = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'welcome-section': CustomElement;
      'golden-rose': CustomElement;
      'case-studies-section': CustomElement;
      'writing-section': CustomElement;
    }
  }
}
