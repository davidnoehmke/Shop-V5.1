/* LEAFerservice Materialstruktur – lightweight, schematic WebGL preview.
 * Uses no external renderer, no network fetches, and renders only after intersection.
 * Actual product imagery is rendered separately by Shopify Liquid.
 */
(() => {
  'use strict';
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const palette = {
    bark: [0.42, 0.22, 0.11], stone: [0.31, 0.30, 0.28],
    charcoal: [0.10, 0.10, 0.095], lava: [0.33, 0.17, 0.13],
    perlite: [0.84, 0.82, 0.76], powder: [0.72, 0.61, 0.48],
    mixed: [0.40, 0.29, 0.22],
  };
  function materialType(handle) {
    const t = String(handle || '').toLowerCase();
    if (/kohle|charcoal|biochar/.test(t)) return 'charcoal';
    if (/rinde|bark|pinien|coco|kokos/.test(t)) return 'bark';
    if (/perlit|perlite/.test(t)) return 'perlite';
    if (/lava|seramis/.test(t)) return 'lava';
    if (/bims|pumice|zeolith|granulat/.test(t)) return 'stone';
    if (/kalk|mehl|powder|earth|erde/.test(t)) return 'powder';
    return 'mixed';
  }
  function randomGenerator(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function mesh(handle) {
    const type = materialType(handle);
    const rnd = randomGenerator(hash(handle));
    const base = palette[type];
    const data = [];
    const up = [0.27, 0.89, 0.36];
    function vertex(p, col) { data.push(p[0], p[1], p[2], col[0], col[1], col[2]); }
    function tri(a, b, c, col) {
      const ab = b.map((v, i) => v - a[i]), ac = c.map((v, i) => v - a[i]);
      const n = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]];
      const len = Math.hypot(...n) || 1;
      const brightness = clamp(.55 + .43 * ((n[0]*up[0]+n[1]*up[1]+n[2]*up[2])/len), .26, 1.02);
      const shade = col.map(v => clamp(v * brightness, 0, 1));
      vertex(a, shade); vertex(b, shade); vertex(c, shade);
    }
    const count = type === 'powder' ? 260 : type === 'bark' ? 95 : 135;
    for (let i=0; i<count; i++) {
      const angle = rnd() * Math.PI * 2, radius = Math.sqrt(rnd()) * 1.02;
      const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius;
      const y = -.55 + (.1 + rnd()*.46) * (1-radius*.24);
      const size = type === 'powder' ? .017+rnd()*.035 : .045+rnd()*.09;
      const stretch = type === 'bark' ? 2.4+rnd()*2.4 : .73+rnd()*.75;
      const rx = size*stretch, ry = size*(type === 'bark' ? .25 : .85), rz = size*(type === 'bark' ? .72 : .9);
      const theta = rnd()*Math.PI*2, cs = Math.cos(theta), sn=Math.sin(theta);
      const local = [
        [rx,0,0],[-rx,0,0],[0,ry,0],[0,-ry,0],[0,0,rz],[0,0,-rz]
      ].map(([a,b,c]) => [x+a*cs-c*sn,y+b,z+a*sn+c*cs]);
      const variance = .68 + rnd()*.54;
      let color = base.map(c => clamp(c * variance, 0,1));
      if (type === 'mixed') {
        const kinds = ['bark','lava','stone','perlite'];
        color = palette[kinds[Math.floor(rnd()*kinds.length)]].map(c => clamp(c*variance, 0,1));
      }
      const faces = [
        [0,2,4],[4,2,1],[1,2,5],[5,2,0],
        [4,3,0],[1,3,4],[5,3,1],[0,3,5]
      ];
      faces.forEach(f => tri(local[f[0]],local[f[1]],local[f[2]],color));
    }
    return new Float32Array(data);
  }
  function shader(gl, type, source) {
    const s=gl.createShader(type);
    if (!s) throw new Error('shader');
    gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) { const err=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(err); }
    return s;
  }
  class MaterialStructure extends HTMLElement {
    connectedCallback() {
      if(this.dataset.ready) return;
      this.dataset.ready='1';
      this.canvas=this.querySelector('canvas');
      this.controls=[...this.querySelectorAll('[data-material]')];
      this.label=this.querySelector('[data-structure-name]');
      this.photo=this.querySelector('[data-structure-photo]');
      this.fallback=this.querySelector('[data-structure-fallback]');
      this.yaw=-.58;this.pitch=.31;this.active=null;this.points=null;
      this.controls.forEach(button => button.addEventListener('click',() => this.select(button)));
      this.canvas.addEventListener('pointerdown', e => {
        this.drag=[e.clientX,e.clientY];
        this.canvas.setPointerCapture(e.pointerId);
      });
      this.canvas.addEventListener('pointermove', e => {
        if(!this.drag) return;
        this.yaw += (e.clientX-this.drag[0])*.009;
        this.pitch=clamp(this.pitch+(e.clientY-this.drag[1])*.007,-.65,1.2);
        this.drag=[e.clientX,e.clientY];this.render();
      });
      this.canvas.addEventListener('pointerup',()=>{this.drag=null;});
      this.canvas.addEventListener('pointercancel',()=>{this.drag=null;});
      this.canvas.addEventListener('keydown',e=>{
        if(e.key==='ArrowLeft'||e.key==='ArrowRight') {
          e.preventDefault();this.yaw += e.key==='ArrowLeft' ? -.18 : .18;this.render();
        }
      });
      this.controls[0] && this.select(this.controls[0]);
      if('IntersectionObserver' in window) {
        this.observer=new IntersectionObserver(entries=>{
          if(entries.some(e=>e.isIntersecting)) {this.observer.disconnect();this.visible=true;this.render();}
        },{rootMargin:'100px'});
        this.observer.observe(this.canvas);
      } else {this.visible=true;this.render();}
    }
    disconnectedCallback() {
      this.observer?.disconnect();
      if(this.gl){this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);}
    }
    select(button) {
      this.controls.forEach(el=>{el.setAttribute('aria-pressed',el===button?'true':'false');});
      this.active=button.dataset.material;
      this.points=mesh(this.active);
      this.label.textContent=button.dataset.title||'';
      const src=button.dataset.image;
      if(src) {this.photo.src=src;this.photo.alt=button.dataset.title||'';this.photo.hidden=false;}
      else this.photo.hidden=true;
      this.render();
    }
    init() {
      const gl=this.canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
      if(!gl) return false;
      const v=shader(gl,gl.VERTEX_SHADER,`
        attribute vec3 pos; attribute vec3 col;
        uniform float yaw; uniform float pitch; uniform float aspect;
        varying vec3 color;
        void main() {
          float cy=cos(yaw),sy=sin(yaw),cp=cos(pitch),sp=sin(pitch);
          vec3 a=vec3(pos.x*cy-pos.z*sy,pos.y,pos.x*sy+pos.z*cy);
          vec3 b=vec3(a.x,a.y*cp-a.z*sp,a.y*sp+a.z*cp);
          float perspective=2.7/(3.5+b.z);
          gl_Position=vec4(b.x*perspective/aspect,(b.y+.12)*perspective,b.z/3.9,1.0);
          color=col;
        }`);
      const f=shader(gl,gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 color;void main(){gl_FragColor=vec4(color,1.0);}`);
      const program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
      gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('shader linking failed');
      this.gl=gl;this.program=program;this.buffer=gl.createBuffer();
      this.pos=gl.getAttribLocation(program,'pos');this.col=gl.getAttribLocation(program,'col');
      this.uYaw=gl.getUniformLocation(program,'yaw');
      this.uPitch=gl.getUniformLocation(program,'pitch');
      this.uAspect=gl.getUniformLocation(program,'aspect');
      gl.enable(gl.DEPTH_TEST);
      return true;
    }
    render() {
      if(!this.visible||!this.points) return;
      try {
        if(!this.gl && !this.init()) return;
        const gl=this.gl;
        const rect=this.canvas.getBoundingClientRect();
        if(!rect.width||!rect.height) return;
        const ratio=Math.min(window.devicePixelRatio||1,1.6);
        const width=Math.max(1,Math.round(Math.min(1000,rect.width*ratio)));
        const height=Math.max(1,Math.round(Math.min(1000,rect.height*ratio)));
        if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
        gl.viewport(0,0,width,height);gl.clearColor(.95,.947,.914,1);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.points,gl.STATIC_DRAW);
        gl.uniform1f(this.uYaw,this.yaw);gl.uniform1f(this.uPitch,this.pitch);
        gl.uniform1f(this.uAspect,width/height);
        gl.enableVertexAttribArray(this.pos);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,24,0);
        gl.enableVertexAttribArray(this.col);gl.vertexAttribPointer(this.col,3,gl.FLOAT,false,24,12);
        gl.drawArrays(gl.TRIANGLES,0,this.points.length/6);
        this.canvas.hidden=false;this.fallback.hidden=true;
      } catch(e) {
        this.canvas.hidden=true;this.fallback.hidden=false;
      }
    }
  }
  if(!customElements.get('leaf-material-structure'))customElements.define('leaf-material-structure',MaterialStructure);
})();
