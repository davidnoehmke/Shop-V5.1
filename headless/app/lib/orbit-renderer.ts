import type {OrbitCamera} from './orbit';
type Bounds = [number, number, number, number];

export function orbitRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  if (!gl) return softwareOrbitRenderer(canvas);
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
  const vertex = compile(
    gl.VERTEX_SHADER,
    `
    attribute vec2 position;
    varying vec2 point;
    void main(){ point=position; gl_Position=vec4(position,0.,1.); }`,
  );
  const fragment = compile(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    varying vec2 point;
    uniform sampler2D earth;
    uniform sampler2D detail;
    uniform vec3 camera;
    uniform vec2 aspect;
    uniform vec4 bounds;
    uniform float hasDetail;
    const float PI=3.14159265359;
    void main(){
      vec2 p=vec2(point.x*aspect.x,(point.y+.10)*aspect.y)/camera.z;
      float r=dot(p,p);
      if(r>1.){gl_FragColor=vec4(0.);return;}
      float z=sqrt(max(0.,1.-r));
      float lat=asin(clamp(p.y*cos(camera.y)+z*sin(camera.y),-1.,1.));
      float lon=camera.x+atan(p.x,z*cos(camera.y)-p.y*sin(camera.y));
      vec2 uv=vec2(fract(lon/(2.*PI)+.5),.5-lat/PI);
      vec3 photo=texture2D(earth,uv).rgb;
      vec2 geo=vec2(uv.x*360.-180.,lat*180./PI);
      if(hasDetail>.5 && geo.x>bounds.x && geo.x<bounds.z && geo.y>bounds.y && geo.y<bounds.w){
        vec2 local=vec2((geo.x-bounds.x)/(bounds.z-bounds.x),(bounds.w-geo.y)/(bounds.w-bounds.y));
        float edge=min(min(local.x,1.-local.x),min(local.y,1.-local.y));
        photo=mix(photo,texture2D(detail,local).rgb,smoothstep(0.,.06,edge));
      }
      gl_FragColor=vec4(photo*(.90+.10*z),1.-smoothstep(.997,1.,r));
    }`,
  );
  const program = gl.createProgram()!;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const buffer = gl.createBuffer()!;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  function texture(unit: number) {
    const item = gl!.createTexture()!;
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, item);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      gl!.RGBA,
      1,
      1,
      0,
      gl!.RGBA,
      gl!.UNSIGNED_BYTE,
      new Uint8Array(4),
    );
    return item;
  }
  const earth = texture(0),
    detail = texture(1);
  gl.uniform1i(gl.getUniformLocation(program, 'earth'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'detail'), 1);
  const rotation = gl.getUniformLocation(program, 'camera'),
    aspect = gl.getUniformLocation(program, 'aspect');
  function upload(unit: number, item: WebGLTexture, image: HTMLImageElement) {
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, item);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      gl!.RGB,
      gl!.RGB,
      gl!.UNSIGNED_BYTE,
      image,
    );
  }
  return {
    image(image: HTMLImageElement) {
      upload(0, earth, image);
    },
    detail(image: HTMLImageElement, bounds: Bounds) {
      upload(1, detail, image);
      gl.uniform4fv(gl.getUniformLocation(program, 'bounds'), bounds);
      gl.uniform1f(gl.getUniformLocation(program, 'hasDetail'), 1);
    },
    draw(camera: OrbitCamera) {
      if (!canvas.clientWidth || !canvas.clientHeight) return;
      const scale = Math.min(
        devicePixelRatio,
        2,
        2048 / Math.max(canvas.clientWidth, canvas.clientHeight),
      );
      const width = Math.round(canvas.clientWidth * scale),
        height = Math.round(canvas.clientHeight * scale);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const diameter = Math.min(width, height) * 0.92;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(aspect, width / diameter, height / diameter);
      gl.uniform3f(
        rotation,
        (camera.lon * Math.PI) / 180,
        (camera.lat * Math.PI) / 180,
        camera.zoom,
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteTexture(earth);
      gl.deleteTexture(detail);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

function imagePixels(image: HTMLImageElement) {
  const surface = document.createElement('canvas');
  surface.width = image.width;
  surface.height = image.height;
  const context = surface.getContext('2d')!;
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}
function sample(
  map: ImageData,
  u: number,
  v: number,
  output: Uint8ClampedArray,
  index: number,
  light: number,
) {
  const x = Math.max(0, Math.min(map.width - 1, u * (map.width - 1)));
  const y = Math.max(0, Math.min(map.height - 1, v * (map.height - 1)));
  const x0 = Math.floor(x),
    y0 = Math.floor(y),
    fx = x - x0,
    fy = y - y0;
  const a = (y0 * map.width + x0) * 4,
    b = (y0 * map.width + Math.min(x0 + 1, map.width - 1)) * 4;
  const c = (Math.min(y0 + 1, map.height - 1) * map.width + x0) * 4,
    d =
      (Math.min(y0 + 1, map.height - 1) * map.width +
        Math.min(x0 + 1, map.width - 1)) *
      4;
  for (let channel = 0; channel < 3; channel++) {
    const top = map.data[a + channel] * (1 - fx) + map.data[b + channel] * fx;
    const bottom =
      map.data[c + channel] * (1 - fx) + map.data[d + channel] * fx;
    output[index + channel] = (top * (1 - fy) + bottom * fy) * light;
  }
  output[index + 3] = 255;
}
function softwareOrbitRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  let map: ImageData | null = null,
    detail: {map: ImageData; bounds: Bounds} | null = null;
  let last = 0,
    lastMotion = 0,
    dirty = true;
  let previous: OrbitCamera = {lat: NaN, lon: NaN, zoom: NaN};
  return {
    image(image: HTMLImageElement) {
      map = imagePixels(image);
      dirty = true;
    },
    detail(image: HTMLImageElement, bounds: Bounds) {
      detail = {map: imagePixels(image), bounds};
      dirty = true;
    },
    draw(camera: OrbitCamera) {
      if (!map || !canvas.clientWidth || !canvas.clientHeight) return;
      const now = performance.now();
      const moving =
        !Number.isFinite(previous.lat) ||
        Math.abs(camera.lat - previous.lat) +
          Math.abs(camera.lon - previous.lon) +
          Math.abs(camera.zoom - previous.zoom) >
          0.001;
      if (moving) lastMotion = now;
      const width = Math.round(
        Math.min(canvas.clientWidth, now - lastMotion > 180 ? 900 : 420),
      );
      const height = Math.round(
        (width * canvas.clientHeight) / canvas.clientWidth,
      );
      if (
        now - last < 33 ||
        (!moving &&
          !dirty &&
          canvas.width === width &&
          canvas.height === height)
      )
        return;
      last = now;
      previous = {...camera};
      dirty = false;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const frame = context.createImageData(width, height);
      const radius = Math.min(width, height) * 0.46;
      const rad = Math.PI / 180,
        sin = Math.sin(camera.lat * rad),
        cos = Math.cos(camera.lat * rad);
      for (let row = 0; row < height; row++) {
        const y = (height * 0.45 - row - 0.5) / radius / camera.zoom;
        for (let col = 0; col < width; col++) {
          const x = (col + 0.5 - width / 2) / radius / camera.zoom,
            r = 1 - x * x - y * y;
          if (r < 0) continue;
          const z = Math.sqrt(r),
            lat = Math.asin(Math.max(-1, Math.min(1, y * cos + z * sin)));
          const lon = camera.lon * rad + Math.atan2(x, z * cos - y * sin);
          const u = (((lon / (2 * Math.PI) + 0.5) % 1) + 1) % 1,
            v = 0.5 - lat / Math.PI;
          const longitude = u * 360 - 180,
            latitude = lat / rad;
          const dst = (row * width + col) * 4;
          if (
            detail &&
            longitude > detail.bounds[0] &&
            longitude < detail.bounds[2] &&
            latitude > detail.bounds[1] &&
            latitude < detail.bounds[3]
          ) {
            sample(
              detail.map,
              (longitude - detail.bounds[0]) /
                (detail.bounds[2] - detail.bounds[0]),
              (detail.bounds[3] - latitude) /
                (detail.bounds[3] - detail.bounds[1]),
              frame.data,
              dst,
              0.9 + 0.1 * z,
            );
          } else sample(map, u, v, frame.data, dst, 0.9 + 0.1 * z);
        }
      }
      context.putImageData(frame, 0, 0);
    },
    dispose() {
      map = null;
      detail = null;
    },
  };
}
