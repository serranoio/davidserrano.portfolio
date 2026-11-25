/**
 * The engineering page is a phoenix with three paths through its body:
 * the mind (thinking), the heart (the Ballad), and the hands (the work).
 * Add essays and projects here; the page renders whatever is listed.
 */
export type PhoenixPathId = 'mind' | 'heart' | 'hands';

interface PathLink {
  title: string;
  href: string;
}

interface PathNote {
  title: string;
  description: string;
}

export interface PhoenixPath {
  id: PhoenixPathId;
  /** Where the path sits on the phoenix. */
  name: string;
  /** The poetic line for the path. */
  verse: string;
  links: readonly PathLink[];
  /** Entries that have no destination yet. */
  notes: readonly PathNote[];
}

interface EngineeringProfile {
  paths: readonly PhoenixPath[];
  /** The tail of the phoenix, grounded to the earth. */
  groundingLine: string;
}

export const engineeringProfile: EngineeringProfile = {
  paths: [
    {
      id: 'mind',
      name: 'The mind',
      verse: 'is where the fire rises, allowing you to turn what you love into reality.',
      links: [{ title: 'Read my writing about engineering', href: '/writing.html?tag=tech' }],
      notes: [],
    },
    {
      id: 'heart',
      name: 'The heart',
      verse: 'is where the love for creation starts.',
      links: [{ title: 'Read My Coding Poetry: The Ballad Of Programata', href: '/#rose' }],
      notes: [],
    },
    {
      id: 'hands',
      name: 'The hands',
      verse: 'are there for you to build what you love.',
      links: [{ title: 'The House of Arcana: automated trading on Kalshi', href: '#house-of-arcana' }],
      notes: [],
    },
  ],
  groundingLine: "You're a badass mf, build the most craziest of dreams.",
};
