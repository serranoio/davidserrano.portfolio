import * as THREE from 'three';
import { GOLD, PETAL } from './rose-look';

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
}

const SHARED_UNIFORMS = {
  uDeep: { value: new THREE.Color(PETAL.deepColor) },
  uLight: { value: new THREE.Color(PETAL.lightColor) },
  uThrough: { value: new THREE.Color(PETAL.throughColor) },
  uGoldColor: { value: new THREE.Color(GOLD.color) },
  uToneRange: { value: new THREE.Vector2(...PETAL.toneRange) },
  uThroughStrength: { value: PETAL.throughStrength },
  uWrap: { value: PETAL.wrap },
  uDirectOcclusion: { value: PETAL.directOcclusion },
  uFibreRelief: { value: PETAL.fibreRelief },
  uGoldGlow: { value: new THREE.Vector2(GOLD.glow, GOLD.rimGlow) },
  uGiltRange: { value: new THREE.Vector2(...GOLD.bodyRange) },
  uThinRange: { value: new THREE.Vector2(...PETAL.thinRange) },
  uVelvet: { value: new THREE.Color(PETAL.velvetColor).multiplyScalar(PETAL.velvetStrength) },
  uFaceOnDepth: { value: PETAL.faceOnDepth },
};

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
  Object.assign(shader.uniforms, SHARED_UNIFORMS, this.userData.petalUniforms as PetalUniforms);
  let fragment = insertAfter(shader.fragmentShader, 'common', FRAGMENT_PARS);
  fragment = fragment.replace('#include <map_fragment>', FRAGMENT_COLOR);
  fragment = insertAfter(fragment, 'normal_fragment_maps', FRAGMENT_RELIEF);
  fragment = insertAfter(fragment, 'emissivemap_fragment', FRAGMENT_LIGHT);
  fragment = insertAfter(fragment, 'aomap_fragment', FRAGMENT_OCCLUDE);
  shader.fragmentShader = fragment;
}

export function createPetalMaterial(maps: PetalMaps): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    map: maps.map,
    normalMap: maps.normalMap,
    aoMap: maps.ormMap,
    roughnessMap: maps.ormMap,
    roughness: PETAL.roughness,
    metalness: 0,
    specularIntensity: PETAL.specularIntensity,
    sheen: PETAL.sheen,
    sheenColor: new THREE.Color(PETAL.sheenColor),
    sheenRoughness: PETAL.sheenRoughness,
    side: THREE.DoubleSide,
  });
  material.normalScale.setScalar(PETAL.normalStrength);
  const uniforms: PetalUniforms = { uGold: { value: 0 } };
  material.userData.petalUniforms = uniforms;
  material.onBeforeCompile = patchPetalShader;
  return material;
}

export function setPetalGold(material: THREE.Material, level: number) {
  (material.userData.petalUniforms as PetalUniforms).uGold.value = level;
}
