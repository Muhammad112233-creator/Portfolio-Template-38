import { createContext, createFullscreenTriangle, createProgram, fitCanvas, FULLSCREEN_VERTEX, loadTexture, type Program } from '@/lib/gl';
import { NOISE } from './noise.glsl';

/**
 * The hero is a single photograph treated like a set you can walk into:
 * scrolling dollies the camera toward a focus point while haze, dust and a
 * flickering light leak keep the frame alive.
 */
const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform vec2 uResolution;
uniform vec2 uImageSize;
uniform vec2 uFocus;
uniform vec2 uPointer;
uniform float uTime;
uniform float uWalk;
uniform float uStride;

${NOISE}

vec2 coverUv(vec2 uv) {
  float screen = uResolution.x / uResolution.y;
  float image = uImageSize.x / uImageSize.y;
  vec2 scale = screen > image ? vec2(1.0, image / screen) : vec2(screen / image, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 p = coverUv(uv);
  vec2 d = p - uFocus;

  float walk = clamp(uWalk, 0.0, 1.0);
  float zoom = 1.0 + walk * 0.55 + walk * walk * 1.75;

  // fake depth: the further from the focus point, the closer to the lens
  float depth = clamp(length(d * vec2(1.0, 1.25)) * 1.7, 0.0, 1.0);
  vec2 sway = vec2(sin(uStride * 6.2831) * 0.0026, abs(sin(uStride * 6.2831)) * 0.0042) * (1.0 - walk * 0.4);
  vec2 parallax = uPointer * (0.004 + 0.015 * depth);
  vec2 s = uFocus + (d * (1.0 - walk * 0.16 * depth) + parallax) / zoom + sway * depth;

  vec3 color = texture(uImage, clamp(s, 0.002, 0.998)).rgb;

  // light leak at the focus, breathing a little
  vec2 dz = d * zoom;
  float flicker = 0.8 + 0.2 * vnoise(vec2(uTime * 3.1, 2.0)) - 0.12 * step(0.965, vnoise(vec2(uTime * 9.0, 7.0)));
  float beam = exp(-abs(dz.x) * 30.0) * smoothstep(0.55, 0.0, abs(dz.y - 0.02));
  color += vec3(1.0, 0.13, 0.10) * beam * flicker * (0.32 + walk * 1.3);

  float haze = fbm(vec2(p.x * 3.0 + uTime * 0.03, p.y * 2.2 - uTime * 0.02) + walk * 2.0);
  float glow = exp(-length(dz * vec2(1.0, 0.8)) * 2.3);
  color += vec3(0.55, 0.06, 0.07) * glow * haze * (0.45 + walk * 1.25);

  // the blue strips pulse along their length
  float cool = max(0.0, color.b - max(color.r, color.g) * 1.05);
  color += vec3(0.08, 0.26, 1.0) * cool * (0.45 + 0.55 * sin(uTime * 1.6 - p.y * 18.0));

  // dust drifting past the lens
  for (int layer = 0; layer < 2; layer++) {
    float scale = layer == 0 ? 9.0 : 17.0;
    vec2 g = dz * scale + vec2(uTime * 0.035, -uTime * 0.05) * float(layer + 1) + float(layer) * 31.0;
    vec2 cell = floor(g);
    vec2 local = fract(g) - 0.5;
    float seed = hash21(cell);
    vec2 offset = (vec2(hash21(cell + 3.3), hash21(cell + 9.1)) - 0.5) * 0.7;
    float mote = smoothstep(0.06, 0.0, length(local + offset)) * step(0.9, seed);
    color += vec3(0.9, 0.55, 0.5) * mote * (0.16 + glow * 0.9) * (0.6 + 0.4 * sin(uTime * 2.0 + seed * 40.0));
  }

  // the last stretch: the light swallows the frame, then lets go
  float flood = smoothstep(0.7, 0.97, walk);
  color = mix(color, vec3(1.0, 0.34, 0.27), clamp(flood * glow * 1.7, 0.0, 1.0));
  color = mix(color, vec3(0.004, 0.016, 0.043), smoothstep(0.9, 1.0, walk));

  vec2 v = uv - 0.5;
  color *= 1.0 - dot(v, v) * 0.75;
  color += (hash21(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.035;

  fragColor = vec4(max(color, 0.0), 1.0);
}`;

const UNIFORMS = ['uImage', 'uResolution', 'uImageSize', 'uFocus', 'uPointer', 'uTime', 'uWalk', 'uStride'];

export class HeroRenderer {
  private gl: WebGL2RenderingContext;
  private program: Program;
  private vao: WebGLVertexArrayObject | null;
  private texture: WebGLTexture | null = null;
  private imageSize: [number, number] = [16, 9];
  private pointer: [number, number] = [0, 0];
  private pointerTarget: [number, number] = [0, 0];
  private walk = 0;
  private stride = 0;
  walkTarget = 0;
  focus: [number, number] = [0.5, 0.44];

  constructor(private canvas: HTMLCanvasElement) {
    const gl = createContext(canvas, false);
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.program = createProgram(gl, FULLSCREEN_VERTEX, FRAGMENT, UNIFORMS);
    this.vao = createFullscreenTriangle(gl);
  }

  async load(url: string) {
    const { texture, width, height } = await loadTexture(this.gl, url);
    this.texture = texture;
    this.imageSize = [width, height];
  }

  setPointer(x: number, y: number) {
    this.pointerTarget = [x, y];
  }

  draw(time: number, delta: number) {
    const { gl, program, canvas } = this;
    if (!this.texture) return;
    if (fitCanvas(canvas, 1.5, 1)) gl.viewport(0, 0, canvas.width, canvas.height);

    const ease = 1 - Math.pow(0.0015, delta);
    const before = this.walk;
    this.walk += (this.walkTarget - this.walk) * ease;
    this.stride += Math.abs(this.walk - before) * 9;
    this.pointer[0] += (this.pointerTarget[0] - this.pointer[0]) * (1 - Math.pow(0.02, delta));
    this.pointer[1] += (this.pointerTarget[1] - this.pointer[1]) * (1 - Math.pow(0.02, delta));

    gl.useProgram(program.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(program.uniforms.uImage, 0);
    gl.uniform2f(program.uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform2f(program.uniforms.uImageSize, this.imageSize[0], this.imageSize[1]);
    gl.uniform2f(program.uniforms.uFocus, this.focus[0], this.focus[1]);
    gl.uniform2f(program.uniforms.uPointer, this.pointer[0], this.pointer[1]);
    gl.uniform1f(program.uniforms.uTime, time % 600);
    gl.uniform1f(program.uniforms.uWalk, this.walk);
    gl.uniform1f(program.uniforms.uStride, this.stride);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  destroy() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
