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
  /** The plain label, so nobody has to decode the metaphor. */
  label: string;
  links: readonly PathLink[];
  /** Entries that have no destination yet. */
  notes: readonly PathNote[];
}

interface EngineeringProfile {
  githubUrl: string;
  paths: readonly PhoenixPath[];
  /** The tail of the phoenix, grounded to the earth. */
  groundingLine: string;
}

export const engineeringProfile: EngineeringProfile = {
  githubUrl: 'https://github.com/serranoio',
  paths: [
    {
      id: 'mind',
      name: 'The mind',
      verse: 'The fire rises, and you can turn what you love into reality.',
      label: 'Thinking about the work',
      links: [
        { title: 'The Missing Piece to Agile', href: '/blog/the-missing-piece-to-agile.html' },
        { title: 'Disruptive Strategic Design', href: '/blog/disruptive-strategic-design.html' },
      ],
      notes: [],
    },
    {
      id: 'heart',
      name: 'The heart',
      verse: 'Where the arrow landed.',
      label: 'The Ballad of Programata',
      links: [{ title: 'Read The Ballad Of Programata', href: '/#rose' }],
      notes: [],
    },
    {
      id: 'hands',
      name: 'The hands',
      verse: 'To care for what you love.',
      label: 'Résumé',
      links: [],
      notes: [
        {
          title: 'The House of Arcana',
          description: 'An automated trading platform on Kalshi. The full story is coming.',
        },
      ],
    },
  ],
  groundingLine: 'What you love is not crazy.',
};
