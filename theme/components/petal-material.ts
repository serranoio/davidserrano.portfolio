import * as THREE from 'three';
import { readColorToken, type ColorToken } from '../design-tokens';
import { GOLD, PETAL, SELECT, SPENT } from './rose-look';

// A living petal: matte, velvety flesh that light passes through where it is
// thin. Built on MeshPhysicalMaterial (for sheen) with three additions the
// stock material has no notion of:
//   1. re-colouring the model's base map between two flesh tones,
//   2. wrap lighting + light transmitted from the far side of the petal,
//   3. a per-petal `gold` level, the only place gold enters the scene.
// It reads the scene's first directional light straight from three's own
// light uniforms, so there is no second copy of the light to keep in sync.

export interface PetalMaps {
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  // glTF occlusion/roughness/metalness texture. R is occlusion, which on this
  // model also tracks thickness: dark at the petal's base, bright at its tip.
  ormMap: THREE.Texture | null;
}

interface PetalUniforms {
  uGold: { value: number };
  // Selection: x is this petal's inner glow (it is the chosen one), y how far
  // it steps back into shadow (another petal is chosen).
  uSelect: { value: THREE.Vector2 };
  // 1 once this petal's poem has been read; 0 while it is still to read.
  uSpent: { value: number };
}

// Everything the petals of one rose share: the uniforms every petal shader
// reads, and the sheen colour. Built once per scene because its colours are
// design tokens, read from the element the scene lives in.
export interface PetalLook {
  sharedUniforms: Record<string, THREE.IUniform>;
  sheenColor: THREE.Color;
}

export function createPetalLook(scope: Element): PetalLook {
  const color = (token: ColorToken) => new THREE.Color(readColorToken(scope, token));
  return {
    sheenColor: color(PETAL.sheenColor),
    sharedUniforms: {
  uDeep: { value: color(PETAL.deepColor) },
  uLight: { value: color(PETAL.lightColor) },
  uThrough: { value: color(PETAL.throughColor) },
  uGoldColor: { value: color(GOLD.color) },
  uToneRange: { value: new THREE.Vector2(...PETAL.toneRange) },
  uThroughStrength: { value: PETAL.throughStrength },
  uWrap: { value: PETAL.wrap },
  uDirectOcclusion: { value: PETAL.directOcclusion },
  uFibreRelief: { value: PETAL.fibreRelief },
  uGoldGlow: { value: new THREE.Vector2(GOLD.glow, GOLD.rimGlow) },
  uGiltRange: { value: new THREE.Vector2(...GOLD.bodyRange) },
  uThinRange: { value: new THREE.Vector2(...PETAL.thinRange) },
  uVelvet: { value: color(PETAL.velvetColor).multiplyScalar(PETAL.velvetStrength) },
  uFaceOnDepth: { value: PETAL.faceOnDepth },
  uSelectColor: { value: color(GOLD.color).lerp(new THREE.Color(1, 1, 1), SELECT.whiteness) },
  uOthersDim: { value: SELECT.othersDim },
  uSpentLook: { value: new THREE.Vector2(SPENT.desaturate, SPENT.dim) },
    },
  };
}

const FRAGMENT_PARS = /* glsl */ `
uniform float uGold;
uniform vec3 uDeep;
uniform vec3 uLight;
uniform vec3 uThrough;
uniform vec3 uGoldColor;
uniform vec2 uToneRange;
uniform float uThroughStrength;
uniform float uWrap;
uniform float uDirectOcclusion;
uniform float uFibreRelief;
uniform vec2 uGoldGlow;
uniform vec2 uGiltRange;
uniform vec2 uThinRange;
uniform vec3 uVelvet;
uniform float uFaceOnDepth;
uniform vec2 uSelect;
uniform vec3 uSelectColor;
uniform float uOthersDim;
uniform float uSpent;
uniform vec2 uSpentLook;

vec3 petalWilt( vec3 c, float amount ) {
  vec3 wilted = mix( c, vec3( dot( c, vec3( 0.299, 0.587, 0.114 ) ) ), uSpentLook.x ) * uSpentLook.y;
  return mix( c, wilted, amount );
}

// Bump from a height difference, after three's own bumpmap chunk (which is
// only compiled in when a bumpMap is assigned).
vec3 petalRelief( vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir ) {
  vec3 sigmaX = normalize( dFdx( surfPos ) );
  vec3 sigmaY = normalize( dFdy( surfPos ) );
  vec3 r1 = cross( sigmaY, surfNorm );
  vec3 r2 = cross( surfNorm, sigmaX );
  float det = dot( sigmaX, r1 ) * faceDir;
  vec3 grad = sign( det ) * ( dHdxy.x * r1 + dHdxy.y * r2 );
  return normalize( abs( det ) * surfNorm - grad );
}
`;

// Replaces <map_fragment>: keep the map's tonal detail, choose our own hue.
const FRAGMENT_COLOR = /* glsl */ `
float petalHeight = 0.5;
#ifdef USE_MAP
  petalHeight = texture2D( map, vMapUv ).r;
#endif
float petalTone = smoothstep( uToneRange.x, uToneRange.y, petalHeight );
vec3 petalFlesh = mix( uDeep, uLight, petalTone );
vec3 petalGilt = uGoldColor * ( 0.35 + 0.65 * petalTone );
// Gold arrives edge-first: a low level is only a lit rim (see the light
// block below); the flesh itself turns once the petal is really chosen.
float petalGiltBody = smoothstep( uGiltRange.x, uGiltRange.y, uGold );
diffuseColor.rgb = mix( petalFlesh, petalGilt, petalGiltBody );
float petalOcclusion = 1.0;
#ifdef USE_AOMAP
  petalOcclusion = texture2D( aoMap, vAoMapUv ).r;
#endif
`;

// After the normal map: fine fibres from the painted map.
const FRAGMENT_RELIEF = /* glsl */ `
#ifdef USE_MAP
{
  vec2 petalDx = dFdx( vMapUv );
  vec2 petalDy = dFdy( vMapUv );
  vec2 petalSlope = vec2(
    texture2D( map, vMapUv + petalDx ).r - petalHeight,
    texture2D( map, vMapUv + petalDy ).r - petalHeight
  ) * uFibreRelief / max( length( petalDx ) + length( petalDy ), 1e-5 );
  normal = petalRelief( - vViewPosition, normal, petalSlope, faceDirection );
}
#endif
`;

// After <emissivemap_fragment>: light that the stock BRDF throws away.
const FRAGMENT_LIGHT = /* glsl */ `
{
  // Spent: a read poem's petal wilts — greyed and darkened — unless gold
  // (hover, selection) is lighting it.
  float petalSpent = uSpent * ( 1.0 - uGold );
  diffuseColor.rgb = petalWilt( diffuseColor.rgb, petalSpent );
  vec3 petalView = normalize( vViewPosition );
  float petalGraze = 1.0 - saturate( dot( normal, petalView ) );
  float petalRim = pow( petalGraze, 3.0 );
  // Velvet: deeper face-on, a pale nap at the turn of every fold.
  diffuseColor.rgb *= mix( mix( uFaceOnDepth, 1.0, petalGiltBody ), 1.0, petalGraze );
  totalEmissiveRadiance += uVelvet * petalGraze * petalGraze * petalOcclusion * ( 1.0 - petalGiltBody );
  #if NUM_DIR_LIGHTS > 0
    vec3 petalLightDir = directionalLights[ 0 ].direction;
    vec3 petalLightColor = directionalLights[ 0 ].color * RECIPROCAL_PI;
    float petalNdotL = dot( normal, petalLightDir );
    // Wrap: the lit side fades past the terminator instead of cutting off.
    float petalWrap = saturate( ( petalNdotL + uWrap ) / ( 1.0 + uWrap ) ) - saturate( petalNdotL );
    // Through: the light is on the far face. Thin tips and grazing edges pass
    // the most; looking toward the light makes it bloom.
    float petalThin = 0.04 + smoothstep( uThinRange.x, uThinRange.y, petalOcclusion ) + 0.25 * petalRim;
    float petalFacingLight = pow( saturate( dot( petalView, - petalLightDir ) ), 2.0 );
    float petalThrough = saturate( - petalNdotL * 0.85 + 0.15 ) * petalThin * ( 0.55 + 0.9 * petalFacingLight );
    vec3 petalThroughColor = mix( uThrough, uGoldColor * 0.6, petalGiltBody ) * mix( 0.45, 1.0, petalTone );
    float petalShade = mix( 1.0, petalOcclusion, uDirectOcclusion );
    totalEmissiveRadiance += petalLightColor * (
      diffuseColor.rgb * petalWrap * petalShade +
      petalThroughColor * petalThrough * uThroughStrength
    );
  #endif
  totalEmissiveRadiance += uGoldColor * ( uGoldGlow.x * petalGiltBody + uGoldGlow.y * uGold * petalRim ) * ( 0.45 + 0.55 * petalTone );
  // Chosen: lit from within, brightest at the thin, grazing lip.
  totalEmissiveRadiance += uSelectColor * uSelect.x * ( 0.4 + 0.6 * petalTone ) * ( 0.65 + 0.35 * petalRim );
  // Not chosen: step back so the chosen petal stands alone.
  float petalRecede = mix( 1.0, uOthersDim, uSelect.y );
  diffuseColor.rgb *= petalRecede;
  totalEmissiveRadiance *= petalRecede;
  // The light passing through a wilted petal is drained with it.
  totalEmissiveRadiance = petalWilt( totalEmissiveRadiance, petalSpent );
}
`;

// After <aomap_fragment>: let the baked occlusion shade direct light too.
const FRAGMENT_OCCLUDE = /* glsl */ `
{
  float petalDirectShade = mix( 1.0, petalOcclusion, uDirectOcclusion );
  reflectedLight.directDiffuse *= petalDirectShade;
  reflectedLight.directSpecular *= petalDirectShade;
  #ifdef USE_SHEEN
    sheenSpecularDirect *= petalDirectShade;
  #endif
}
`;

function insertAfter(source: string, chunk: string, addition: string): string {
  const include = `#include <${chunk}>`;
  if (!source.includes(include)) {
    throw new Error(`[petal-material] three's shader no longer contains ${include}`);
  }
  return source.replace(include, `${include}\n${addition}`);
}

// One function shared by every petal so three compiles a single program.
function patchPetalShader(
  this: THREE.Material,
  shader: THREE.WebGLProgramParametersWithUniforms
) {
  Object.assign(
    shader.uniforms,
    (this.userData.petalLook as PetalLook).sharedUniforms,
    this.userData.petalUniforms as PetalUniforms
  );
  let fragment = insertAfter(shader.fragmentShader, 'common', FRAGMENT_PARS);
  fragment = fragment.replace('#include <map_fragment>', FRAGMENT_COLOR);
  fragment = insertAfter(fragment, 'normal_fragment_maps', FRAGMENT_RELIEF);
  fragment = insertAfter(fragment, 'emissivemap_fragment', FRAGMENT_LIGHT);
  fragment = insertAfter(fragment, 'aomap_fragment', FRAGMENT_OCCLUDE);
  shader.fragmentShader = fragment;
}

export function createPetalMaterial(maps: PetalMaps, look: PetalLook): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    map: maps.map,
    normalMap: maps.normalMap,
    aoMap: maps.ormMap,
    roughnessMap: maps.ormMap,
    roughness: PETAL.roughness,
    metalness: 0,
    specularIntensity: PETAL.specularIntensity,
    sheen: PETAL.sheen,
    sheenColor: look.sheenColor,
    sheenRoughness: PETAL.sheenRoughness,
    side: THREE.DoubleSide,
  });
  material.normalScale.setScalar(PETAL.normalStrength);
  const uniforms: PetalUniforms = {
    uGold: { value: 0 },
    uSelect: { value: new THREE.Vector2() },
    uSpent: { value: 0 },
  };
  material.userData.petalUniforms = uniforms;
  material.userData.petalLook = look;
  material.onBeforeCompile = patchPetalShader;
  return material;
}

export function setPetalGold(material: THREE.Material, level: number) {
  (material.userData.petalUniforms as PetalUniforms).uGold.value = level;
}

// `glow` lights the chosen petal from within; `recede` (0–1) dims a petal
// that was not chosen.
export function setPetalSelect(material: THREE.Material, glow: number, recede: number) {
  (material.userData.petalUniforms as PetalUniforms).uSelect.value.set(glow, recede);
}

// Marks a petal whose poem has been read (1) or is still to read (0).
export function setPetalSpent(material: THREE.Material, spent: boolean) {
  (material.userData.petalUniforms as PetalUniforms).uSpent.value = spent ? 1 : 0;
}
