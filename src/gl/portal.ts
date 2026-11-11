import { createContext, createFullscreenTriangle, createProgram, fitCanvas, FULLSCREEN_VERTEX, type Program } from '@/lib/gl';
import { NOISE } from './noise.glsl';

/**
 * The intro: a slow spiral that tightens, flashes and opens like an iris
 * onto the page. Everything is driven by five numbers (see PortalMotion).
 */
export type PortalMotion = {
  progress: number;
  rupture: number;
  palette: number;
  dive: number;
  dissolve: number;
};

const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uSpin;
uniform float uInward;
uniform float uDrift;
uniform float uProgress;
uniform float uRupture;
uniform float uPalette;
uniform float uDive;
uniform float uDissolve;

${NOISE}

const float TAU = 6.28318530718;

void main() {
  vec2 q = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  vec2 p = q * mix(1.0, 0.05, uDive * uDive);

  float r = length(p) + 1e-4;
  float angle = atan(p.y, p.x);
  float lr = log(r);

  // logarithmic spiral: three soft arms winding into the core
  float wind = 2.4 + uRupture * 1.5;
  float phase = angle * 3.0 + lr * wind * 1.5 - uSpin * TAU;
  vec2 sp = vec2(phase / TAU, lr * 1.6 - uInward * 4.0);
  float warp = fbm(sp * vec2(1.0, 2.2) + vec2(0.0, uDrift * 0.05));
  float band = 0.5 + 0.5 * sin(phase + warp * 4.2);
  band = pow(band, 2.3 - uRupture * 0.9);
  float streak = fbm(vec2(phase * 0.9, lr * 7.0 - uInward * 14.0));
  float arm = band * (0.5 + 0.5 * streak);

  float fall = exp(-r * 1.5) * smoothstep(0.012, 0.15, r);
  float core = exp(-r * r * (95.0 - uRupture * 60.0)) * (0.8 + uRupture * 1.7);
  float halo = exp(-r * 7.0) * 0.55;

  vec3 blue = vec3(0.09, 0.28, 1.0);
  vec3 violet = vec3(0.50, 0.24, 0.96);
  vec3 pale = vec3(0.86, 0.90, 1.0);
  float lean = clamp(uPalette * (0.72 + 0.28 * sin(angle * 2.0 + uSpin * 3.0)), 0.0, 1.0);
  vec3 tint = mix(blue, violet, lean);

  vec3 color = vec3(0.012, 0.012, 0.045);
  color += tint * arm * fall * (1.25 + uProgress * 0.9 + uRupture * 1.4);
  color += mix(tint, pale, 0.6) * halo * (0.6 + uProgress * 0.7);
  color += pale * core;

  // specks carried inward by the current
  vec2 grid = vec2(angle / TAU * 46.0 + lr * 3.0, lr * 9.0 - uInward * 7.0);
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float seed = hash21(cell);
  vec2 jitter = (vec2(hash21(cell + 7.1), hash21(cell + 13.7)) - 0.5) * 0.6;
  float speck = smoothstep(0.1, 0.0, length(local + jitter)) * step(0.84, seed);
  color += pale * speck * smoothstep(0.03, 0.25, r) * exp(-r * 1.1) * (1.2 + uRupture * 2.0);

  color += pale * uRupture * uRupture * exp(-r * 3.0) * 0.5;
  color = mix(color, pale, smoothstep(0.5, 1.0, uDive) * 0.94);
  color *= 1.0 - 0.38 * smoothstep(0.45, 1.25, length((gl_FragCoord.xy / uResolution - 0.5) * 2.0));

  // the iris: opens from the centre with a ragged edge
  float edge = length(q) + (fbm(q * 3.0 + uDrift * 0.1) - 0.5) * 0.22;
  float iris = smoothstep(uDissolve * 1.7 - 0.28, uDissolve * 1.7, edge);
  float alpha = uDissolve > 0.001 ? iris * (1.0 - smoothstep(0.86, 1.0, uDissolve)) : 1.0;

  fragColor = vec4(color * alpha, alpha);
}`;

const UNIFORMS = ['uResolution', 'uSpin', 'uInward', 'uDrift', 'uProgress', 'uRupture', 'uPalette', 'uDive', 'uDissolve'];

export class PortalRenderer {
  private gl: WebGL2RenderingContext;
  private program: Program;
  private vao: WebGLVertexArrayObject | null;
  private frame = 0;
  private last = 0;
  private spin = 0;
  private inward = 0;
  private drift = 0;
  private painted = false;
  private destroyed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private getMotion: () => PortalMotion,
    private hooks: { onFirstFrame?: () => void; onContextLost?: () => void } = {},
  ) {
    const gl = createContext(canvas, true);
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.program = createProgram(gl, FULLSCREEN_VERTEX, FRAGMENT, UNIFORMS);
    this.vao = createFullscreenTriangle(gl);
    canvas.addEventListener('webglcontextlost', this.handleLost);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  private handleLost = (event: Event) => {
    event.preventDefault();
    this.stop();
    this.hooks.onContextLost?.();
  };

  private resize = () => {
    if (this.destroyed) return;
    if (fitCanvas(this.canvas, 1, 1)) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  };

  start() {
    if (this.frame || this.destroyed) return;
    const step = (now: number) => {
      this.frame = requestAnimationFrame(step);
      const delta = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0.016;
      this.last = now;
      this.draw(delta);
    };
    this.frame = requestAnimationFrame(step);
  }

  stop() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.last = 0;
  }

  private draw(delta: number) {
    const { gl, program } = this;
    const motion = this.getMotion();
    const t = Math.min(1, Math.max(0, motion.rupture));
    const surge = t * t * (3 - 2 * t);
    this.spin += delta * (0.11 + 0.18 * surge);
    this.inward += delta * (0.055 + 0.04 * surge);
    this.drift += delta * (1 + 0.55 * surge);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(program.uniforms.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(program.uniforms.uSpin, this.spin);
    gl.uniform1f(program.uniforms.uInward, this.inward);
    gl.uniform1f(program.uniforms.uDrift, this.drift);
    gl.uniform1f(program.uniforms.uProgress, motion.progress);
    gl.uniform1f(program.uniforms.uRupture, motion.rupture);
    gl.uniform1f(program.uniforms.uPalette, motion.palette);
    gl.uniform1f(program.uniforms.uDive, motion.dive);
    gl.uniform1f(program.uniforms.uDissolve, motion.dissolve);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    if (!this.painted) {
      this.painted = true;
      this.hooks.onFirstFrame?.();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    this.canvas.removeEventListener('webglcontextlost', this.handleLost);
    window.removeEventListener('resize', this.resize);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
