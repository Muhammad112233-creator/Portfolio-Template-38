/** The handful of WebGL2 helpers the shader canvases share. */

export type Program = {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
};

export const FULLSCREEN_VERTEX = `#version 300 es
layout(location = 0) in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export function createContext(canvas: HTMLCanvasElement, alpha = false): WebGL2RenderingContext | null {
  try {
    return canvas.getContext('webgl2', {
      alpha,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
  } catch {
    return null;
  }
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'unknown error';
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string,
  uniformNames: string[],
): Program {
  const program = gl.createProgram();
  if (!program) throw new Error('Could not create program');
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(program) ?? 'unknown error'}`);
  }
  const uniforms: Program['uniforms'] = {};
  for (const name of uniformNames) uniforms[name] = gl.getUniformLocation(program, name);
  return { program, uniforms };
}

/** One oversized triangle covers the viewport; cheaper than a quad. */
export function createFullscreenTriangle(gl: WebGL2RenderingContext) {
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vao;
}

/** Match the drawing buffer to the element. Returns true when it changed. */
export function fitCanvas(canvas: HTMLCanvasElement, maxDpr = 1.5, scale = 1) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * scale;
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

export function loadTexture(gl: WebGL2RenderingContext, url: string): Promise<{ texture: WebGLTexture; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      const texture = gl.createTexture();
      if (!texture) return reject(new Error('Could not create texture'));
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      resolve({ texture, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

/**
 * Runs a callback every animation frame, but only while the element is on
 * screen and the tab is visible. Returns a stop function.
 */
export function frameLoop(element: Element, draw: (time: number, delta: number) => void) {
  let frame = 0;
  let last = 0;
  let onScreen = true;
  let stopped = false;

  const step = (now: number) => {
    frame = 0;
    if (stopped) return;
    const delta = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
    last = now;
    draw(now / 1000, delta);
    schedule();
  };
  const schedule = () => {
    if (!frame && onScreen && !document.hidden && !stopped) frame = requestAnimationFrame(step);
  };
  const observer = new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      if (onScreen) {
        last = 0;
        schedule();
      }
    },
    { rootMargin: '10% 0px' },
  );
  observer.observe(element);
  const onVisibility = () => {
    last = 0;
    schedule();
  };
  document.addEventListener('visibilitychange', onVisibility);
  schedule();

  return () => {
    stopped = true;
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    if (frame) cancelAnimationFrame(frame);
  };
}
