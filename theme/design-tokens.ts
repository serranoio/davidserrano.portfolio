// The global colour tokens declared in theme/index.css, for code that cannot
// write `var(--token)` — WebGL materials and canvas drawing. CSS stays the one
// place a colour's value is written; this file only names the tokens and reads
// them back at runtime.
//
// Only tokens declared as plain colours are listed. Derived tokens
// (`color-mix(...)`) are not readable as a colour this way.
export const COLOR_TOKEN = {
  crimsonPrimary: '--color-crimson-primary',
  crimsonLight: '--color-crimson-light',
  crimsonDark: '--color-crimson-dark',
  crimsonSoft: '--color-crimson-soft',
  goldPrimary: '--color-gold-primary',
  bg: '--color-bg',
  text: '--color-text',
} as const;

export type ColorToken = (typeof COLOR_TOKEN)[keyof typeof COLOR_TOKEN];

// Reads a token as it resolves on `scope`, so an element inside an
// always-night section gets the night value in either theme. Browser only:
// call it when a scene is built, never at module load.
export function readColorToken(scope: Element, token: ColorToken): string {
  const value = getComputedStyle(scope).getPropertyValue(token).trim();
  if (!value) {
    throw new Error(`Colour token ${token} is not defined on <${scope.localName}>; is theme/index.css loaded?`);
  }
  return value;
}
