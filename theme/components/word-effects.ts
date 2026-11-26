import { BEAT_EFFECT } from './beat-effect';
import { FORGE_EFFECT } from './forge-effect';
import { GOLDEN_EFFECT } from './golden-effect';
import { POTENTIAL_EFFECT } from './potential-effect';
import { POUR_EFFECT } from './poured-effect';
import { STORM_EFFECT } from './storm-effect';

// Every word effect the preface can use, by the name its marker gives:
// `{{pour:poured}}`, `{{beat:passion}}`, `{{golden:golden ratio}}` (see
// word-effect.ts).
export const WORD_EFFECTS = {
  pour: POUR_EFFECT,
  beat: BEAT_EFFECT,
  forge: FORGE_EFFECT,
  storm: STORM_EFFECT,
  potential: POTENTIAL_EFFECT,
  golden: GOLDEN_EFFECT,
};

export type WordEffectName = keyof typeof WORD_EFFECTS;
