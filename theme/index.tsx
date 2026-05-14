import './index.css';
// Import to register the custom element
import './components/golden-rose';

// Re-export everything from the original theme
export * from '@rspress/core/theme-original';

// Override the HomeLayout to show the golden rose
export function HomeLayout() {
  return <golden-rose />;
}

// TypeScript: declare the custom element for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'golden-rose': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
