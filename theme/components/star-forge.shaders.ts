// Shaders for the forged star (see star-forge.ts). All three draw additively
// in HDR and go through the renderer's tone mapping, so the brightest light
// clips to white the way an overexposed photograph does.
import { NOISE_GLSL } from './glsl-noise';

// Blackbody-ish ramp by brightness: amber → pale gold → white.
const BLACKBODY_GLSL = /* glsl */ `
uniform vec3 uWhite;
uniform vec3 uPaleGold;
uniform vec3 uAmber;
uniform float uGoldAt;
uniform float uWhiteAt;
vec3 blackbody( float intensity ) {
  vec3 c = mix( uAmber, uPaleGold, smoothstep( 0.0, uGoldAt, intensity ) );
  return mix( c, uWhite, smoothstep( uGoldAt, uWhiteAt, intensity ) );
}
`;

// The beam's light along its length: soft at the star, soft where it lands,
// and only as far as it has reached (u in 0–1 from star to rose).
const BEAM_ALONG_GLSL = /* glsl */ `
uniform float uReach;
uniform float uEndSoftness;
float beamAlong( float u ) {
  float ends = smoothstep( 0.0, uEndSoftness, u ) * smoothstep( 0.0, uEndSoftness, 1.0 - u );
  float front = 1.0 - smoothstep( uReach - uEndSoftness, uReach, u );
  return ends * front;
}
`;

const FRAGMENT_OUTPUT_GLSL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

// --- Glow: a billboard whose light is a gaussian core plus a ~1/r² glare. ---
export const GLOW_VERTEX_SHADER = /* glsl */ `
uniform vec3 uCenter;
uniform float uExtent;
varying vec2 vLocal;
void main() {
  vLocal = position.xy * uExtent;
  vec4 mvCenter = viewMatrix * vec4( uCenter, 1.0 );
  gl_Position = projectionMatrix * ( mvCenter + vec4( vLocal, 0.0, 0.0 ) );
}
`;

export const GLOW_FRAGMENT_SHADER = /* glsl */ `
uniform float uExtent;
uniform float uCoreRadius;
uniform float uCoreIntensity;
uniform float uGlareGain;
uniform float uGlareRadius;
uniform float uHaloGain;
uniform float uHaloRadius;
uniform float uTurbulence;
uniform float uTurbulenceScale;
uniform float uTime;
uniform float uOpacity;
varying vec2 vLocal;
${NOISE_GLSL}
${BLACKBODY_GLSL}
void main() {
  float r = length( vLocal );
  // Corona: slow turbulence that mottles the inner glare. Sampled on the
  // plane (not in angle) so it never organises into rays.
  vec3 q = vec3( vLocal * uTurbulenceScale, uTime );
  float churn = noise( q ) * 0.6 + noise( q * 2.3 + 7.1 ) * 0.4;
  float corona = exp( - r / ( uCoreRadius * 3.0 ) );
  float mottle = 1.0 + uTurbulence * ( churn - 0.5 ) * 2.0 * corona;

  float core = exp( - ( r * r ) / ( uCoreRadius * uCoreRadius ) );
  float glare = uGlareGain / ( 1.0 + ( r * r ) / ( uGlareRadius * uGlareRadius ) );
  float halo = uHaloGain / ( 1.0 + ( r * r ) / ( uHaloRadius * uHaloRadius ) );
  float intensity = uCoreIntensity * ( core + glare * mottle + halo );
  // No edge: everything is gone well before the billboard ends.
  intensity *= 1.0 - smoothstep( 0.35, 1.0, r / uExtent );

  gl_FragColor = vec4( blackbody( intensity ) * intensity * uOpacity, 1.0 );
  ${FRAGMENT_OUTPUT_GLSL}
}
`;

// --- Beam: a camera-facing ribbon with a gaussian cross-section. -----------
export const BEAM_VERTEX_SHADER = /* glsl */ `
attribute float aU;
attribute float aSide;
uniform vec3 uStart;
uniform vec3 uEnd;
uniform float uHalfWidth;
varying float vU;
varying float vSide;
void main() {
  vec3 p = mix( uStart, uEnd, aU );
  vec3 axis = normalize( uEnd - uStart );
  vec3 across = normalize( cross( axis, normalize( cameraPosition - p ) ) );
  vU = aU;
  vSide = aSide * uHalfWidth;
  gl_Position = projectionMatrix * viewMatrix * vec4( p + across * vSide, 1.0 );
}
`;

export const BEAM_FRAGMENT_SHADER = /* glsl */ `
uniform float uSigma;
uniform float uHalfWidth;
uniform float uScatterSigma;
uniform float uScatterGain;
uniform float uIntensity;
uniform float uLength;
uniform float uShimmer;
uniform float uShimmerScale;
uniform float uTime;
uniform float uOpacity;
varying float vU;
varying float vSide;
${NOISE_GLSL}
${BLACKBODY_GLSL}
${BEAM_ALONG_GLSL}
void main() {
  float core = exp( -0.5 * ( vSide * vSide ) / ( uSigma * uSigma ) );
  float scatter = uScatterGain * exp( -0.5 * ( vSide * vSide ) / ( uScatterSigma * uScatterSigma ) );
  // Air is never perfectly even: a faint density variation flows along it.
  float flow = noise( vec3( vU * uLength * uShimmerScale - uTime, vSide * 40.0, 0.0 ) );
  float shimmer = 1.0 + uShimmer * ( flow - 0.5 ) * 2.0;
  float edge = 1.0 - smoothstep( 0.5, 1.0, abs( vSide ) / uHalfWidth );
  float intensity = uIntensity * ( core + scatter ) * edge * beamAlong( vU ) * shimmer;
  gl_FragColor = vec4( blackbody( intensity ) * intensity * uOpacity, 1.0 );
  ${FRAGMENT_OUTPUT_GLSL}
}
`;

// --- Dust: motes that are only visible where the beam lights them. ---------
export const DUST_VERTEX_SHADER = /* glsl */ `
attribute float aU;
attribute vec2 aOffset;
attribute float aSeed;
attribute float aSize;
uniform vec3 uStart;
uniform vec3 uEnd;
uniform vec3 uAcrossA;
uniform vec3 uAcrossB;
uniform float uSigma;
uniform float uLitSigma;
uniform float uDrift;
uniform float uTime;
uniform float uWobble;
uniform float uWobbleHz;
uniform float uPixelRatio;
uniform float uIntensity;
uniform float uAnisotropy;
varying float vIntensity;
${BEAM_ALONG_GLSL}
float henyeyGreenstein( float cosTheta, float g ) {
  float g2 = g * g;
  return ( 1.0 - g2 ) / pow( 1.0 + g2 - 2.0 * g * cosTheta, 1.5 );
}
void main() {
  float u = fract( aU + uDrift );
  float phase = aSeed * 6.2831853;
  vec2 wobble = uWobble * vec2( sin( uTime * uWobbleHz * 6.2831853 + phase ),
                                cos( uTime * uWobbleHz * 4.7 + phase * 1.7 ) );
  vec2 offset = aOffset * uSigma + wobble;
  vec3 p = mix( uStart, uEnd, u ) + uAcrossA * offset.x + uAcrossB * offset.y;

  // Light reaching the mote: the beam's outer profile at its distance from
  // the axis, scattered toward the eye mostly forward.
  float lit = exp( -0.5 * dot( offset, offset ) / ( uLitSigma * uLitSigma ) );
  vec3 axis = normalize( uEnd - uStart );
  float cosTheta = dot( axis, normalize( cameraPosition - p ) );
  float scatter = henyeyGreenstein( cosTheta, uAnisotropy ) / henyeyGreenstein( 0.0, uAnisotropy );
  vIntensity = uIntensity * lit * beamAlong( u ) * scatter;

  vec4 mv = viewMatrix * vec4( p, 1.0 );
  gl_Position = projectionMatrix * mv;
  gl_PointSize = vIntensity > 0.002 ? aSize * uPixelRatio / max( 0.1, - mv.z ) : 0.0;
}
`;

export const DUST_FRAGMENT_SHADER = /* glsl */ `
uniform float uOpacity;
varying float vIntensity;
${BLACKBODY_GLSL}
void main() {
  float d = length( gl_PointCoord - 0.5 ) * 2.0;
  float falloff = exp( - d * d * 4.0 ) * ( 1.0 - smoothstep( 0.7, 1.0, d ) );
  float intensity = vIntensity * falloff;
  gl_FragColor = vec4( blackbody( intensity ) * intensity * uOpacity, 1.0 );
  ${FRAGMENT_OUTPUT_GLSL}
}
`;
