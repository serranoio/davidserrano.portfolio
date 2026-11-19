import * as THREE from 'three';
import { breath } from './breath';
import { SKY, STAR_CONFIG } from './shooting-stars-config';

const VERTEX_SHADER = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = normalize( position );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

// A deep vertical gradient with slow, faint haze in it. The haze is three
// octaves of value noise on the view direction: enough to keep the dark from
// being flat, far too soft to read as cloud.
const FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform float uHazeStrength;
uniform float uTime;
varying vec3 vDirection;

float hash( vec3 p ) {
  p = fract( p * 0.3183099 + 0.1 );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}

float noise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( mix( hash( i ), hash( i + vec3( 1, 0, 0 ) ), f.x ),
         mix( hash( i + vec3( 0, 1, 0 ) ), hash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
    mix( mix( hash( i + vec3( 0, 0, 1 ) ), hash( i + vec3( 1, 0, 1 ) ), f.x ),
         mix( hash( i + vec3( 0, 1, 1 ) ), hash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ),
    f.z );
}

void main() {
  vec3 dir = normalize( vDirection );
  float height = smoothstep( -0.35, 0.85, dir.y );
  vec3 color = mix( uHorizon, uZenith, height );

  vec3 p = dir * 1.6 + vec3( uTime, 0.0, uTime * 0.6 );
  float haze = noise( p ) * 0.55 + noise( p * 2.1 ) * 0.3 + noise( p * 4.3 ) * 0.15;
  haze = smoothstep( 0.5, 0.82, haze );
  // Haze gathers low and thins toward the zenith.
  color += uHaze * haze * uHazeStrength * ( 1.0 - 0.75 * height );

  gl_FragColor = vec4( color, 1.0 );
  #include <colorspace_fragment>
  // Break up 8-bit banding in the dark gradient. Applied after the transfer
  // to display space, where one code value really is one step.
  gl_FragColor.rgb += ( fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) - 0.5 ) / 255.0;
}
`;

// The night behind the rose: an inside-out sphere far beyond the stars.
export class SkyDome {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color(SKY.zenith) },
        uHorizon: { value: new THREE.Color(SKY.horizon) },
        uHaze: { value: new THREE.Color(SKY.haze) },
        uHazeStrength: { value: SKY.hazeStrength },
        uTime: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(STAR_CONFIG.roseStarSphereRadius * 2, 32, 16),
      this.material
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  update(nowSec: number) {
    this.material.uniforms.uTime.value = breath.still ? 0 : nowSec * SKY.hazeDriftPerSec;
    this.material.uniforms.uHazeStrength.value =
      SKY.hazeStrength * (1 - SKY.hazeBreath * (1 - breath.level()));
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
  }
}
