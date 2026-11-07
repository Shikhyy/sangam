"use client";

import { useEffect, useRef } from "react";

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * An oil-painted countryside drawn on the GPU: brush-stroked fields, soft hills, a small farmhouse
 * and rows of trees. The top fades into the page colour so it sits on the page without a seam.
 */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
out vec4 o;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float hash1(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = u_time;
  vec3 cream = vec3(0.949, 0.937, 0.894);
  float horizon = 0.52;

  float stroke = noise(vec2(p.x * 7.0 + sin(t * 0.2) * 0.03, p.y * 90.0));
  float stroke2 = fbm(vec2(p.x * 3.0, p.y * 40.0));

  // Sky with soft painted clouds.
  float cl = fbm(vec2(p.x * 1.1 - t * 0.01, p.y * 3.0));
  vec3 sky = mix(vec3(0.9, 0.92, 0.88), vec3(0.76, 0.84, 0.8), smoothstep(0.95, horizon, uv.y));
  sky = mix(sky, vec3(0.97, 0.95, 0.9), smoothstep(0.45, 0.72, cl) * 0.55);
  vec3 col = sky;

  // Distant hills.
  float h1 = horizon + 0.035 + 0.05 * fbm(vec2(p.x * 0.9 + 2.0, 1.0));
  h1 += 0.07 * smoothstep(aspect * 0.55, aspect * 0.85, p.x) * fbm(vec2(p.x * 0.6, 4.0));
  float hill = smoothstep(h1 + 0.004, h1 - 0.004, uv.y);
  col = mix(col, vec3(0.64, 0.72, 0.6) * (0.92 + 0.16 * stroke2), hill);

  // Fields in perspective, painted with long horizontal strokes.
  float inField = smoothstep(horizon + 0.003, horizon - 0.003, uv.y);
  float depth = clamp((horizon - uv.y) / horizon, 0.0, 1.0);
  float sx = mix(16.0, 3.0, depth);
  float fs = noise(vec2(p.x * sx + 7.0 * depth, uv.y * 150.0));
  float fs2 = fbm(vec2(p.x * sx * 0.5, uv.y * 55.0));
  vec3 g1 = vec3(0.3, 0.4, 0.2);
  vec3 g2 = vec3(0.5, 0.6, 0.3);
  vec3 g3 = vec3(0.72, 0.78, 0.48);
  vec3 field = mix(g1, g2, smoothstep(0.25, 0.7, fs2));
  field = mix(field, g3, smoothstep(0.55, 0.9, fs) * (0.35 + 0.4 * (1.0 - depth)));
  field = mix(field, vec3(0.82, 0.86, 0.64), (1.0 - depth) * 0.5);
  float dab = smoothstep(0.5, 0.68, noise(vec2(p.x * sx * 0.9, uv.y * 36.0 + depth * 5.0)));
  float dab2 = smoothstep(0.55, 0.72, noise(vec2(p.x * sx * 2.2 + 3.0, uv.y * 80.0)));
  field = mix(field, g3, dab * 0.55 * (0.4 + depth));
  field = mix(field, g1 * 0.9, dab2 * 0.35 * depth);
  col = mix(col, field, inField);

  // A small farmhouse and barn near the middle of the horizon.
  vec2 hp = (p - vec2(aspect * 0.5, horizon - 0.004)) * 0.6;
  float wall1 = step(abs(hp.x + 0.05), 0.052) * step(0.0, hp.y) * step(hp.y, 0.034);
  float roof1 = step(0.034, hp.y) * step(hp.y, 0.034 + 0.028 * (1.0 - abs(hp.x + 0.05) / 0.066));
  float wall2 = step(abs(hp.x - 0.075), 0.034) * step(0.0, hp.y) * step(hp.y, 0.026);
  float roof2 = step(0.026, hp.y) * step(hp.y, 0.026 + 0.02 * (1.0 - abs(hp.x - 0.075) / 0.044));
  vec3 wallCol = vec3(0.64, 0.54, 0.42) * (0.9 + 0.2 * stroke);
  vec3 roofCol = vec3(0.4, 0.33, 0.3) * (0.9 + 0.2 * stroke);
  col = mix(col, wallCol, max(wall1, wall2));
  col = mix(col, roofCol, max(roof1, roof2));

  // Trees, drawn far to near so the near ones overlap.
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    float tx = hash1(fi + 1.0) * aspect;
    float dpt = (fi + 0.5 + hash1(fi + 40.0) * 0.6) / 19.0;
    float ty = horizon - 0.008 - dpt * horizon * 0.92;
    float r = 0.022 + dpt * 0.1;
    vec2 c = vec2(tx, ty + r * 1.5);
    vec2 d = p - c;
    float dist = length(d * vec2(1.0, 1.1)) + (noise(d / r * 3.2 + fi) - 0.5) * r * 0.55;
    float shade = smoothstep(r * 1.2, r * 0.2, length((p - vec2(tx + r * 0.25, ty)) * vec2(1.0, 3.4)));
    col *= 1.0 - 0.32 * shade * step(p.y, horizon);
    float canopy = smoothstep(r, r * 0.84, dist);
    float light = clamp((d.y / r + 0.7) * 0.55 + stroke2 * 0.4 - dist / r * 0.25 + (noise(d / r * 6.5 + fi * 3.1) - 0.5) * 0.7, 0.0, 1.0);
    vec3 tc = mix(vec3(0.15, 0.25, 0.13), vec3(0.46, 0.56, 0.26), smoothstep(0.1, 0.95, light));
    float trunk = smoothstep(r * 0.13, r * 0.06, abs(p.x - tx)) * step(ty, p.y) * step(p.y, ty + r * 0.9);
    col = mix(col, vec3(0.26, 0.21, 0.16), trunk);
    col = mix(col, tc, canopy);
  }

  col *= 0.94 + 0.12 * stroke;
  col = mix(col, floor(col * 9.0 + 0.5) / 9.0, 0.16);
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.03;
  float fade = smoothstep(0.98, 0.66, uv.y);
  col = mix(cream, col, fade);
  o = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function PaintedLandscape({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vert || !frag || !program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    // biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is a WebGL call, not a React hook
    gl.useProgram(program);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let raf = 0;
    const start = performance.now();

    const draw = (seconds: number) => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(2, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(2, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, seconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      if (visible && !document.hidden) draw((now - start) / 1000 + 4);
      raf = requestAnimationFrame(loop);
    };

    if (reduced) draw(6);
    else raf = requestAnimationFrame(loop);

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    observer.observe(canvas);
    const onResize = () => draw((performance.now() - start) / 1000 + 4);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label="A painted countryside with fields, trees and a small farmhouse"
    />
  );
}
