/** Add professional details here when ready. Unfilled sections stay out of the page. */
interface Experience {
  role: string;
  organization: string;
  period: string;
  description: string;
}

interface EngineeringProfile {
  introduction: string;
  experience: readonly Experience[];
  resumeUrl?: string;
  contactUrl?: string;
  githubUrl: string;
}

export const engineeringProfile: EngineeringProfile = {
  introduction:
    'I’m David Serrano, a software engineer. I care about the craft of building software: discovering the right solution, understanding why it works, and shaping how it feels to use.',
  experience: [],
  githubUrl: 'https://github.com/serranoio',
};
