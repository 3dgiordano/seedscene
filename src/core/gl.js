// Minimal WebGL2 helpers: full-screen quad, shader compilation, ping-pong FBOs.
// Everything the styles draw is a fragment shader over one quad, which is both
// how the demoscene did it and the fastest path to a stable frame rate.

export const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export function createContext(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  return gl;
}

export function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    const numbered = src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
    throw new Error(`Shader compile failed:\n${log}\n---\n${numbered}`);
  }
  return sh;
}

export function program(gl, fragSrc, vertSrc = VERT) {
  return finishProgram(gl, startProgram(gl, fragSrc, vertSrc));
}

/**
 * Hand a program to the driver to compile and link, without asking how it
 * went: asking is what makes the page wait for it. With the parallel-compile
 * extension the driver works on it in the background meanwhile.
 */
export function startProgram(gl, fragSrc, vertSrc = VERT) {
  const p = gl.createProgram();
  const shaders = [[gl.VERTEX_SHADER, vertSrc], [gl.FRAGMENT_SHADER, fragSrc]].map(([type, src]) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(p, sh);
    return { sh, src };
  });
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  return { p, shaders };
}

/** Whether a started program is done, without waiting for it (true when the driver cannot tell). */
export function programDone(gl, started, parallel) {
  return !parallel || gl.getProgramParameter(started.p, parallel.COMPLETION_STATUS_KHR);
}

/** A started program, ready to draw with: waits for the rest of its compile if it is not done. */
export function finishProgram(gl, started) {
  const { p, shaders } = started;
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    for (const { sh, src } of shaders) {
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const numbered = src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
        throw new Error(`Shader compile failed:\n${gl.getShaderInfoLog(sh)}\n---\n${numbered}`);
      }
    }
    throw new Error('Program link failed: ' + gl.getProgramInfoLog(p));
  }
  const uniforms = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name);
  }
  return { p, uniforms };
}

export function quad(gl) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vao;
}

export function createTarget(gl, w, h, filter = null) {
  const f = filter === null ? gl.LINEAR : filter;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, w, h };
}
