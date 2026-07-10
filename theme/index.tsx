import './index.css';
// Import to register the custom elements (side-effect imports).
import './components/welcome-section';
import './components/golden-rose';
// import './components/case-studies-section'; // Hidden until real case studies exist
import './components/writing-section';
import './components/music-player';
import { createElement } from 'react';

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

// On touch devices only, snap the html element vertically so a short flick
// lands the next home section flush at the top — this is the "seamless
// transition" mechanic for mobile. Desktop wheel behavior is untouched
// because the rule is scoped to `(pointer: coarse)`. `prefers-reduced-motion`
// resets scroll-behavior to `auto` so the Continue pill jumps instead of
// gliding for users who asked for that.
if (typeof document !== 'undefined') {
  const injectMobileScrollRules = () => {
    if (document.getElementById('mobile-scroll-rules')) return;
    const style = document.createElement('style');
    style.id = 'mobile-scroll-rules';
    style.textContent = `
      @media (pointer: coarse) {
        html {
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
        }
        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }
      }
    `;
    document.head.appendChild(style);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectMobileScrollRules);
  } else {
    injectMobileScrollRules();
  }
}

// Re-export everything from the original theme
export * from '@rspress/core/theme-original';

// Home page composes top-level sections vertically. Each section is its
// own Lit element so they can own their own DOM, lifecycle, and styles
// without leaking into siblings. The explicit wrapper guarantees rspress's
// home container can't squash the rose section below its 100vh height.
export function HomeLayout() {
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
