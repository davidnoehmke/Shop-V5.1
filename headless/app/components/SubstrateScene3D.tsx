import {useEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import type {MixPart} from '~/lib/substrate-mix';

type V3 = [number, number, number];
type Rgb = [number, number, number];
type Camera = {yaw: number; pitch: number};
const SEGMENTS = 40;
const MAX_CANVAS_PIXELS = 1300;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function normalize(a: V3): V3 {
  const n = Math.hypot(...a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
}
function dot(a: V3, b: V3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function multiply(a: number[], b: number[]) {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) {
        out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
      }
    }
  }
  return out;
}
function cameraMatrix({yaw, pitch}: Camera, aspect: number) {
  const radius = 4.5;
  const eye: V3 = [Math.sin(yaw) * Math.cos(pitch) * radius, 0.83 + Math.sin(pitch) * radius, Math.cos(yaw) * Math.cos(pitch) * radius];
  const center: V3 = [0, 0.85, 0];
  const backwards = normalize([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
  const right = normalize(cross([0, 1, 0], backwards));
  const up = cross(backwards, right);
  const view = [
    right[0], up[0], backwards[0], 0,
    right[1], up[1], backwards[1], 0,
    right[2], up[2], backwards[2], 0,
    -dot(right, eye), -dot(up, eye), -dot(backwards, eye), 1,
  ];
  const near = 0.1, far = 30, f = 1 / Math.tan(Math.PI / 6);
  const projection = [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ];
  return new Float32Array(multiply(projection, view));
}
function mixColor(part: MixPart): Rgb {
  const n = (part.handle + ' ' + part.title).toLowerCase();
  if (/perlit/.test(n)) return [0.92, 0.93, 0.88];
  if (/bims|pumice/.test(n)) return [0.55, 0.56, 0.55];
  if (/seramis/.test(n)) return [0.7, 0.33, 0.23];
  if (/algenkalk|limestone/.test(n)) return [0.86, 0.78, 0.6];
  if (/lava/.test(n)) return [0.46, 0.29, 0.24];
  if (/rinde|bark|pinien/.test(n)) return [0.5, 0.31, 0.19];
  if (/kokos|coco/.test(n)) return [0.6, 0.42, 0.29];
  if (/zeolith/.test(n)) return [0.55, 0.68, 0.62];
  return [0.45, 0.39, 0.29];
}
function buildVertices(parts: MixPart[]) {
  const out: number[] = [];
  const vertex = (p: V3, color: Rgb) => out.push(...p, ...color);
  const triangle = (a: V3, b: V3, c: V3, color: Rgb) => {
    vertex(a, color); vertex(b, color); vertex(c, color);
  };
  const shade = (color: Rgb, intensity: number): Rgb => color.map(v => clamp(v * intensity, 0, 1)) as Rgb;
  const radiusAt = (height: number) => 0.75 + height * 0.065;
  const circle = (r: number, y: number, segment: number): V3 => {
    const angle = (segment / SEGMENTS) * Math.PI * 2;
    return [Math.cos(angle) * r, y, Math.sin(angle) * r];
  };

  let bottom = 0.13;
  const totalHeight = 1.67;
  for (const [index, part] of parts.entries()) {
    if (part.share <= 0) continue;
    const height = (part.share / 100) * totalHeight;
    const top = bottom + height;
    const baseColor = mixColor(part);
    for (let seg = 0; seg < SEGMENTS; seg++) {
      const light = 0.81 + 0.19 * Math.cos((seg / SEGMENTS) * Math.PI * 2 - 0.7);
      const variation = 0.95 + 0.09 * Math.sin(seg * 7.23 + index * 12.1);
      const color = shade(baseColor, light * variation);
      const a = circle(radiusAt(bottom), bottom, seg);
      const b = circle(radiusAt(bottom), bottom, seg + 1);
      const c = circle(radiusAt(top), top, seg + 1);
      const d = circle(radiusAt(top), top, seg);
      triangle(a, b, c, color); triangle(a, c, d, color);
      const capColor = shade(baseColor, 1.01 + 0.065 * Math.cos(seg * 11.2));
      triangle([0, top, 0], d, c, capColor);
    }
    bottom = top;
  }
  // A subtle physical rim and foot make the layers read as a real, sectioned planter.
  const stone: Rgb = [0.52, 0.59, 0.52];
  for (const [level, inner, outer, thick] of [[1.84, 0.84, 0.92, 0.08], [0.12, 0.7, 0.77, 0.08]] as const) {
    for (let i = 0; i < SEGMENTS; i++) {
      const o1 = circle(outer, level, i), o2 = circle(outer, level, i + 1);
      const i1 = circle(inner, level, i), i2 = circle(inner, level, i + 1);
      triangle(o1, o2, i2, shade(stone, 1.08)); triangle(o1, i2, i1, shade(stone, 1.08));
      triangle(o1, circle(outer, level - thick, i), circle(outer, level - thick, i + 1), shade(stone, 0.74));
      triangle(o1, circle(outer, level - thick, i + 1), o2, shade(stone, 0.74));
    }
  }
  return new Float32Array(out);
}

class SubstrateRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private position: number;
  private color: number;
  private mvp: WebGLUniformLocation | null;
  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {alpha: false, antialias: true, powerPreference: 'low-power'});
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('WebGL shader could not be created');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const reason = gl.getShaderInfoLog(shader) || 'Unknown shader error';
        gl.deleteShader(shader);
        throw new Error(reason);
      }
      return shader;
    };
    const vert = compile(gl.VERTEX_SHADER,
      'attribute vec3 aPosition; attribute vec3 aColor; uniform mat4 uMvp; varying vec3 vColor; void main() {gl_Position=uMvp*vec4(aPosition,1.0); vColor=aColor;}');
    const frag = compile(gl.FRAGMENT_SHADER,
      'precision mediump float; varying vec3 vColor; void main() {gl_FragColor=vec4(vColor,1.0);}');
    const program = gl.createProgram();
    if (!program) throw new Error('WebGL program could not be created');
    gl.attachShader(program, vert); gl.attachShader(program, frag); gl.linkProgram(program);
    gl.deleteShader(vert); gl.deleteShader(frag);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'WebGL program failed');
    }
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('WebGL buffer could not be created');
    this.program = program; this.buffer = buffer;
    this.position = gl.getAttribLocation(program, 'aPosition');
    this.color = gl.getAttribLocation(program, 'aColor');
    this.mvp = gl.getUniformLocation(program, 'uMvp');
  }
  draw(parts: MixPart[], camera: Camera) {
    const gl = this.gl;
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    const width = Math.max(1, Math.round(Math.min(rect.width * ratio, MAX_CANVAS_PIXELS)));
    const height = Math.max(1, Math.round(Math.min(rect.height * ratio, MAX_CANVAS_PIXELS)));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width; this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.945, 0.951, 0.925, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    const verts = buildVertices(parts);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.uniformMatrix4fv(this.mvp, false, cameraMatrix(camera, width / height));
    gl.enableVertexAttribArray(this.position);
    gl.vertexAttribPointer(this.position, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(this.color);
    gl.vertexAttribPointer(this.color, 3, gl.FLOAT, false, 24, 12);
    // Both sides are visible as a cutaway, avoiding a fully opaque exterior shell.
    gl.disable(gl.CULL_FACE);
    gl.drawArrays(gl.TRIANGLES, 0, verts.length / 6);
  }
  dispose() {
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
  }
}

function AccessiblePot({mix, locale}: {mix: MixPart[]; locale: 'de' | 'en'}) {
  return <div className="substrate-pot-visual" aria-label={locale === 'de' ? 'Substratmischung als Schichten' : 'Layered substrate composition'}>
    {mix.map(part => <div key={part.id} style={{height: `${part.share}%`, backgroundColor: `rgb(${mixColor(part).map(v => Math.round(v * 255)).join(',')})`}}>
      <span>{part.title} · {part.share}%</span>
    </div>)}
  </div>;
}

export default function SubstrateScene3D({mix, locale}: {mix: MixPart[]; locale: 'de' | 'en'}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<SubstrateRenderer | null>(null);
  const lastPoint = useRef<{x:number;y:number}|null>(null);
  const [camera, setCamera] = useState<Camera>({yaw: -0.65, pitch: 0.34});
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setVisible(true);
    }, {rootMargin: '120px'});
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible || !canvas || webglFailed) return;
    try {
      if (!renderer.current) renderer.current = new SubstrateRenderer(canvas);
      const draw = () => {
        try {
          renderer.current?.draw(mix, camera);
          setReady(true);
        } catch {
          setWebglFailed(true);
        }
      };
      draw();
      const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
      resize?.observe(canvas);
      if (!resize) window.addEventListener('resize', draw);
      return () => {
        resize?.disconnect();
        if (!resize) window.removeEventListener('resize', draw);
      };
    } catch {
      setWebglFailed(true);
    }
  }, [mix, camera, visible, webglFailed]);
  useEffect(() => () => {renderer.current?.dispose(); renderer.current = null;}, []);

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    lastPoint.current = {x:event.clientX,y:event.clientY};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!lastPoint.current) return;
    const dx = event.clientX - lastPoint.current.x, dy = event.clientY - lastPoint.current.y;
    lastPoint.current = {x:event.clientX,y:event.clientY};
    setCamera(value => ({yaw:value.yaw - dx * .008, pitch:clamp(value.pitch - dy * .006, -0.35, 1.35)}));
  }
  return <section className="substrate-scene-3d" aria-label={locale === 'de' ? '3D-Substratansicht' : '3D substrate view'}>
    <div className="substrate-scene-3d__stage">
      {!ready || webglFailed ? <AccessiblePot mix={mix} locale={locale}/> : null}
      <canvas ref={canvasRef} role="img" aria-label={locale === 'de' ? 'Drehbare dreidimensionale Darstellung deiner Rezeptur' : 'Interactive three-dimensional view of your recipe'}
        className={ready && !webglFailed ? 'substrate-scene-3d__canvas is-ready' : 'substrate-scene-3d__canvas'}
        onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={() => {lastPoint.current = null;}} onPointerCancel={() => {lastPoint.current = null;}}
      />
    </div>
    <div className="substrate-scene-3d__footer">
      <p>{locale === 'de' ? '3D-Vorschau · Materialfarben symbolisch, nicht maßstabsgetreu' : '3D preview · symbolic colors, not to scale'}</p>
      {ready && !webglFailed ? <button type="button" onClick={() => setCamera({yaw:-0.65,pitch:.34})}>{locale === 'de' ? 'Ansicht zurücksetzen' : 'Reset view'}</button> : null}
    </div>
  </section>;
}
