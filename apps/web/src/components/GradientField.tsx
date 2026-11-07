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
 * A live painting: brush-stroked sky and clouds with leafy foliage at the edges. Golden light grows
 * with the Hindi share and the sky stays cool for English. Everything is computed per pixel on the GPU.
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
mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  q += (u_mouse - 0.5) * vec2(0.06, 0.04);
  float t = u_time;
  float tw = 0.55 + u_tangle * 0.5;

  vec2 w = vec2(fbm(q + vec2(0.0, t * 0.03)), fbm(q + vec2(4.2, 1.7) - t * 0.025));
  vec2 p = q + (w - 0.5) * tw;

  // Brush strokes: streaky noise stretched along a slowly turning direction.
  float ang = (fbm(p * 1.1 + 7.0) - 0.5) * 2.2 + 0.5;
  vec2 sp = rot(ang) * p;
  float bristle = noise(vec2(sp.x * 3.0, sp.y * 70.0));
  float stroke = fbm(vec2(sp.x * 2.0, sp.y * 14.0));
  float paint = 0.65 * stroke + 0.35 * bristle;

  // Sky, lighter towards the horizon.
  float h = q.y + (w.x - 0.5) * 0.35;
  vec3 skyHi = vec3(0.5, 0.66, 0.85);
  vec3 skyLo = vec3(0.78, 0.87, 0.92);
  vec3 sky = mix(skyLo, skyHi, smoothstep(-0.35, 0.45, h));

  // Painted clouds.
  float cl = fbm(p * 1.5 + w * 1.3 + vec2(t * 0.02, 0.0));
  float cloud = smoothstep(0.42, 0.54, cl + (paint - 0.5) * 0.3);

  // Golden light grows with the Hindi share.
  float warmth = clamp(u_share + (fbm(p * 0.9 + 3.0) - 0.5) * 0.5, 0.0, 1.0);
  vec3 cloudCol = mix(vec3(0.96, 0.95, 0.91), vec3(1.0, 0.76, 0.5), smoothstep(0.35, 0.8, warmth));
  vec3 skyCol = mix(sky, vec3(0.97, 0.74, 0.46), smoothstep(0.5, 0.95, warmth) * smoothstep(0.3, -0.4, h) * 0.75);
  vec3 col = mix(skyCol, cloudCol, cloud);
  col *= 0.9 + 0.14 * paint;

  // Foliage creeping in from the corners, with leafy edges.
  float leafN = fbm(p * 3.4 + w * 1.4);
  float ridged = 1.0 - abs(2.0 * noise(p * 9.0 + t * 0.02) - 1.0);
  float distL = length((q - vec2(-aspect * 0.5 - 0.2, -0.1)) * vec2(0.85, 1.05));
  float distR = length((q - vec2(aspect * 0.5 + 0.22, 0.2)) * vec2(0.9, 1.1));
  float d = min(distL, distR * 1.15);
  float glow = smoothstep(0.55, 0.05, length((q - vec2(0.0, 0.2)) * vec2(0.7, 1.25)));
  float fol = smoothstep(0.44, 0.36, d + (leafN - 0.5) * 0.45 + (ridged - 0.5) * 0.2);
  fol *= 1.0 - glow * 0.95;
  col = mix(col, col * 0.35 + 0.65 * vec3(0.94, 0.96, 0.99), glow * 0.5);
  vec3 leafDark = vec3(0.17, 0.24, 0.14);
  vec3 leafMid = vec3(0.36, 0.45, 0.22);
  vec3 leafLight = vec3(0.62, 0.7, 0.4);
  float lv = clamp(paint * 1.1 + (ridged - 0.5) * 0.9 + (leafN - 0.5) * 0.6, 0.0, 1.0);
  vec3 leaf = mix(leafDark, leafMid, smoothstep(0.25, 0.6, lv));
  leaf = mix(leaf, leafLight, smoothstep(0.62, 0.85, lv) * (0.5 + 0.5 * warmth));
  col = mix(col, leaf, fol);

  col = mix(col, floor(col * 8.0 + 0.5) / 8.0, 0.18);
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.035;
  col *= 1.0 - 0.16 * smoothstep(0.35, 0.9, length(q * vec2(0.7, 1.0)));
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
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.85;
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
