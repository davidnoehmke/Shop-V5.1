import type {OrbitCamera} from './orbit';

export function orbitRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {alpha: true, antialias: true, powerPreference: 'low-power'});
  if (!gl) return null;
  function compile(type: number, code: string) {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, code);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      gl!.deleteShader(shader);
      throw new Error('Globe renderer unavailable');
    }
    return shader;
  }
  const vertex = compile(gl.VERTEX_SHADER, `
    attribute vec2 position;
    varying vec2 point;
    void main() { point = position; gl_Position = vec4(position, 0., 1.); }`);
  const fragment = compile(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 point;
    uniform sampler2D earth;
    uniform vec3 camera;
    const float PI = 3.14159265359;
    void main() {
      vec2 p = point / camera.z;
      float r = dot(p,p);
      if (r > 1.) { gl_FragColor = vec4(0.); return; }
      float z = sqrt(max(0.,1.-r));
      float lat = asin(clamp(p.y*cos(camera.y)+z*sin(camera.y),-1.,1.));
      float lon = camera.x + atan(p.x,z*cos(camera.y)-p.y*sin(camera.y));
      vec2 uv = vec2(fract(lon/(2.*PI)+.5), .5-lat/PI);
      vec3 photo = texture2D(earth,uv).rgb;
      gl_FragColor = vec4(photo * (.86+.14*z), 1.-smoothstep(.997,1.,r));
    }`);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {gl.deleteProgram(program); return null;}
  const buffer = gl.createBuffer()!;
  const texture = gl.createTexture()!;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const rotation = gl.getUniformLocation(program, 'camera');
  return {
    image(image: HTMLImageElement) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    },
    draw(camera: OrbitCamera) {
      const pixels = Math.min(1536, Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 2)));
      if (canvas.width !== pixels) canvas.width = canvas.height = pixels;
      gl.viewport(0, 0, pixels, pixels);
      gl.uniform3f(rotation, camera.lon*Math.PI/180, camera.lat*Math.PI/180, camera.zoom);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);},
  };
}
