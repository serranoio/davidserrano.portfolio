import { BEAT_EFFECT } from './beat-effect';
import { POUR_EFFECT } from './poured-effect';

// Every word effect the preface can use, by the name its marker gives:
// `{{pour:poured}}`, `{{beat:passion}}` (see word-effect.ts).
export const WORD_EFFECTS = {
  pour: POUR_EFFECT,
  beat: BEAT_EFFECT,
};

export type WordEffectName = keyof typeof WORD_EFFECTS;
