"use client";

import { type RefObject, useEffect, useRef } from "react";

/** What the gradient should look like. The parent changes these in place; the field eases towards them. */
export interface FieldControl {
  /** Hindi share, 0 to 1: how much of the blob is warm rather than indigo. */
  share: number;
  /** How tangled the flow is, 0 to 1: more switching, more folds and finer lines. */
  tangle: number;
  /** Energy, 0 to 1: how fast it flows. */
  level: number;
}

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * A warped gradient blob (warm for Hindi, indigo for English) on paper, with fine scan-lines that
 * appear along the edges and ripple with the flow. Everything is computed per pixel on the GPU.
 */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_share;
uniform float u_tangle;
uniform vec2 u_mouse;
out vec4 o;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  q += (u_mouse - 0.5) * vec2(0.12, 0.08);
  float t = u_time;
  float w = 1.0 + u_tangle * 0.9;

  vec2 warp = vec2(fbm(q * 1.2 + vec2(0.0, t * 0.05)), fbm(q * 1.2 + vec2(5.2, 1.3) - t * 0.04));
  float n = fbm(q * 1.1 * w + warp * 1.8 + vec2(t * 0.03, -t * 0.02));
  float n2 = fbm(q * 1.6 + warp * 1.4 + vec2(3.3, 7.1) + t * 0.02);
  float shape = fbm(q * 0.9 + warp * 1.2 + 3.1 - t * 0.025);

  float body = shape + 0.5 - length(q * vec2(0.78, 1.1)) * 0.95;
  float mask = smoothstep(0.5, 0.68, body);

  float hue = n + (u_share - 0.5) * 1.15;
  float warm = smoothstep(0.43, 0.58, hue);

  vec3 cream = vec3(0.949, 0.937, 0.894);
  vec3 yellow = vec3(1.0, 0.82, 0.2);
  vec3 orange = vec3(1.0, 0.43, 0.1);
  vec3 lime = vec3(0.6, 0.88, 0.28);
  vec3 indigo = vec3(0.17, 0.11, 0.4);
  vec3 blue = vec3(0.34, 0.3, 0.74);

  vec3 warmCol = mix(mix(yellow, lime, 0.3 * (1.0 - smoothstep(0.35, 0.55, n2))), orange, smoothstep(0.56, 0.84, hue));
  vec3 coolCol = mix(indigo, blue, smoothstep(0.3, 0.46, hue));
  vec3 blob = mix(coolCol, warmCol, warm);

  float edgeWarm = 1.0 - abs(warm * 2.0 - 1.0);
  float edgeBody = 1.0 - abs(mask * 2.0 - 1.0);
  float lineMask = clamp(edgeWarm * 0.95 + edgeBody * 1.05, 0.0, 1.0);

  float lines = 58.0 + 46.0 * u_tangle;
  float yy = uv.y + (n - 0.5) * 0.24 + (shape - 0.5) * 0.2;
  float s = smoothstep(0.18, 0.82, 0.5 + 0.5 * sin(yy * lines * 6.28318));

  vec3 col = mix(cream, blob, mask);
  col = mix(col, col * (0.6 + 0.4 * s), lineMask * 0.92);
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.03;
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

export function GradientField({ className, control }: { className?: string; control?: RefObject<FieldControl> }) {
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

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uRes = uniform("u_res");
    const uTime = uniform("u_time");
    const uShare = uniform("u_share");
    const uTangle = uniform("u_tangle");
    const uMouse = uniform("u_mouse");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const now = { share: 0.5, tangle: 0.3, level: 0 };
    let clock = 12;
    let last = performance.now();
    let visible = true;
    let raf = 0;

    const resize = () => {
      // The gradient is soft, so it renders below full resolution and the browser scales it up.
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.7;
      const w = Math.max(2, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(2, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    };

    const draw = (dt: number) => {
      resize();
      const goal = control?.current ?? { share: 0.5, tangle: 0.3, level: 0 };
      now.share += (goal.share - now.share) * 0.05;
      now.tangle += (goal.tangle - now.tangle) * 0.04;
      now.level += (goal.level - now.level) * 0.08;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      clock += dt * (1 + now.level * 2.4);
      gl.uniform1f(uTime, clock);
      gl.uniform1f(uShare, now.share);
      gl.uniform1f(uTangle, now.tangle);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      mouse.ty = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height));
    };

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      if (visible && !document.hidden) draw(dt);
      raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      now.share = control?.current.share ?? 0.5;
      now.tangle = control?.current.tangle ?? 0.3;
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
      window.addEventListener("pointermove", onMove, { passive: true });
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    observer.observe(canvas);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      // Keep the context itself: React Strict Mode runs this effect twice on the same canvas.
      gl.deleteProgram(program);
    };
  }, [control]);

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label="A slowly moving gradient: warm for Hindi, indigo for English"
    />
  );
}
