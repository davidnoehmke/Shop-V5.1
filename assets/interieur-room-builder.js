  class InterieurRoomBuilder extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready === 'true') return;
      this.dataset.ready = 'true';
      this.canvas = this.querySelector('[data-room-canvas]');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.room = {
        width: Number(this.querySelector('[data-room-width]')?.value || 4.2),
        depth: Number(this.querySelector('[data-room-depth]')?.value || 3.2),
        height: Number(this.querySelector('[data-room-height]')?.value || 2.5)
      };
      const css = getComputedStyle(this);
      this.colors = Object.fromEntries(['cream','sand','sage','eucalyptus','olive','taupe'].map(name => [name, css.getPropertyValue('--leaf-' + name).trim() || css.getPropertyValue(({cream: '--background', sand: '--surface', sage: '--surface', eucalyptus: '--accent', olive: '--foreground', taupe: '--border'})[name]).trim() || css.color]));
      this.camera = -35;
      this.objects = [];
      this.selectedId = null;
      this.drag = null;
      this.objectId = 0;
      this.productImages = new Map();
      this.currency = this.dataset.currency || 'EUR';
      this.locale = this.dataset.locale || document.documentElement.lang || 'de-DE';

      this.bind();
      this.addEventListener('change', (event) => {
        if (event.target.matches('[data-object-select]')) { this.selectedId = Number(event.target.value); this.draw(); }
        if (event.target.matches('[data-position]')) {
          const obj = this.selected();
          const value = Number(event.target.value);
          if (obj && Number.isFinite(value)) { obj[event.target.dataset.position] = value; this.clampObject(obj); this.save(); this.draw(); this.updateSummary(); }
        }
      });
      this.restore();
      this.clampObjects();
      if (!this.objects.length) {
        this.addPrimitive('plant', -0.75, 0.2);
        this.addPrimitive('plant', 0.55, 0.55);
      }
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas);
      this.resize();
      this.updateSummary();
    }

    disconnectedCallback() {
      this.resizeObserver?.disconnect();
    }

    bind() {
      ['width', 'depth', 'height'].forEach((key) => {
        this.querySelector(`[data-room-${key}]`)?.addEventListener('input', (event) => {
          const limits = key === 'height' ? [2, 5] : [2, 12];
          this.room[key] = this.clamp(Number(event.target.value || limits[0]), limits[0], limits[1]);
          this.clampObjects();
          this.save();
          this.draw();
          this.updateSummary();
        });
      });

      this.querySelectorAll('[data-add-primitive]').forEach((button) => {
        button.addEventListener('click', () => this.addPrimitive(button.dataset.addPrimitive));
      });
      this.querySelector('[data-add-product]')?.addEventListener('click', () => this.addProduct());
      this.querySelectorAll('[data-camera]').forEach((button) => {
        button.addEventListener('click', () => {
          this.camera += Number(button.dataset.camera || 0);
          this.draw();
          this.save();
        });
      });
      this.querySelectorAll('[data-object-rotate]').forEach((button) => {
        button.addEventListener('click', () => this.rotateSelected(Number(button.dataset.objectRotate || 0)));
      });
      this.querySelector('[data-delete]')?.addEventListener('click', () => this.deleteSelected());
      this.querySelector('[data-duplicate]')?.addEventListener('click', () => this.duplicateSelected());
      this.querySelector('[data-builder-reset]')?.addEventListener('click', () => this.reset());
      this.querySelector('[data-add-setup]')?.addEventListener('click', () => this.addSetupToCart());

      this.canvas.addEventListener('pointerdown', (event) => this.pointerDown(event));
      this.canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
      this.canvas.addEventListener('pointerup', () => this.pointerUp());
      this.canvas.addEventListener('pointercancel', () => this.pointerUp());
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      this.draw();
    }

    addPrimitive(kind, x = 0, z = 0) {
      const presets = {
        plant: {title: 'Plant', width: .52, depth: .52, height: 1.05, color: this.colors.sage},
        shelf: {title: 'Shelf', width: 1.2, depth: .38, height: 1.8, color: this.colors.taupe},
        window: {title: 'Window', width: 1.4, depth: .12, height: 1.25, color: this.colors.eucalyptus}
      };
      const preset = presets[kind];
      if (!preset) return;
      const obj = {
        id: ++this.objectId,
        kind,
        title: this.querySelector(`[data-add-primitive="${kind}"]`)?.textContent?.trim() || preset.title,
        x,
        z,
        rotation: 0,
        width: preset.width,
        depth: preset.depth,
        height: preset.height,
        color: preset.color,
        variantId: null,
        price: 0,
        watts: 0,
        url: ''
      };
      this.objects.push(obj);
      this.selectedId = obj.id;
      this.clampObject(obj);
      this.save();
      this.draw();
      this.updateSummary();
    }

    addProduct() {
      const select = this.querySelector('[data-builder-product-select]');
      const option = select?.selectedOptions?.[0];
      if (!option?.value) return;
      const search = (option.dataset.search || '').toLowerCase();
      const kind = this.productKind(search);
      const preset = this.productPreset(kind);
      const obj = {
        id: ++this.objectId,
        kind,
        title: option.dataset.title || option.textContent.trim(),
        x: 0,
        z: 0,
        rotation: 0,
        width: preset.width,
        depth: preset.depth,
        height: preset.height,
        color: preset.color,
        variantId: option.value,
        price: Number(option.dataset.price || 0),
        watts: Number(option.dataset.watts || 0),
        url: option.dataset.url || '',
        image: option.dataset.image || ''
      };
      this.objects.push(obj);
      this.selectedId = obj.id;
      this.preloadImage(obj.image);
      this.save();
      this.draw();
      this.updateSummary();
    }

    productKind(search) {
      if (/terrarium|gewächshaus|growzelt|pflanzenregal|station/.test(search)) return 'system';
      if (/regal|grove|bar|tube|unterbau/.test(search)) return 'shelf-light';
      if (/pendel|pendant|wand|aspect|luna/.test(search)) return 'pendant';
      if (/stand|willow|stello|alta|teleskop/.test(search)) return 'floor-light';
      if (/aquascap|wasserpflanz|sera|daytime/.test(search)) return 'habitat';
      return 'light';
    }

    productPreset(kind) {
      const presets = {
        system: {width: 1.25, depth: .72, height: 1.75, color: this.colors.taupe},
        'shelf-light': {width: 1.15, depth: .38, height: 1.55, color: this.colors.taupe},
        pendant: {width: .45, depth: .45, height: 2.0, color: this.colors.taupe},
        'floor-light': {width: .52, depth: .52, height: 1.85, color: this.colors.taupe},
        habitat: {width: 1.0, depth: .55, height: 1.0, color: this.colors.taupe},
        light: {width: .42, depth: .42, height: 1.65, color: this.colors.taupe}
      };
      return presets[kind] || presets.light;
    }

    preloadImage(url) {
      if (!url || this.productImages.has(url)) return;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => this.draw();
      img.src = url;
      this.productImages.set(url, img);
    }

    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    clampObject(obj) {
      const halfW = this.room.width / 2;
      const halfD = this.room.depth / 2;
      obj.x = this.clamp(obj.x, -halfW + .15, halfW - .15);
      obj.z = this.clamp(obj.z, -halfD + .15, halfD - .15);
    }

    clampObjects() {
      this.objects.forEach((obj) => this.clampObject(obj));
    }

    metrics() {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const scale = Math.min(w / (this.room.width + this.room.depth + 2), h / (this.room.depth + this.room.height + 2)) * 1.35;
      return {w, h, scale, ox: w * .5, oy: h * .69};
    }

    project(x, y, z) {
      const {scale, ox, oy} = this.metrics();
      const a = this.camera * Math.PI / 180;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const xr = x * c - z * s;
      const zr = x * s + z * c;
      return {
        x: ox + xr * scale,
        y: oy + zr * scale * .48 - y * scale * .88
      };
    }

    localPoint(obj, x, z) {
      const angle = obj.rotation * Math.PI / 180;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return {
        x: obj.x + x * c - z * s,
        z: obj.z + x * s + z * c
      };
    }

    roomFloorPoints() {
      const hw = this.room.width / 2;
      const hd = this.room.depth / 2;
      return [
        this.project(-hw, 0, -hd),
        this.project(hw, 0, -hd),
        this.project(hw, 0, hd),
        this.project(-hw, 0, hd)
      ];
    }

    polygon(points, fill, stroke = null, width = 1) {
      const ctx = this.ctx;
      ctx.beginPath();
      points.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.lineWidth = width;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    }

    drawRoom() {
      const ctx = this.ctx;
      const floor = this.roomFloorPoints();
      this.polygon(floor, this.colors.cream, this.colors.eucalyptus, Math.max(1, this.canvas.width / 1400));

      const grid = .5;
      const hw = this.room.width / 2;
      const hd = this.room.depth / 2;
      ctx.save();
      ctx.strokeStyle = this.colors.sand;
      ctx.lineWidth = Math.max(1, this.canvas.width / 1800);
      for (let x = -hw; x <= hw + .001; x += grid) {
        const a = this.project(x, 0, -hd);
        const b = this.project(x, 0, hd);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (let z = -hd; z <= hd + .001; z += grid) {
        const a = this.project(-hw, 0, z);
        const b = this.project(hw, 0, z);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();

      const backLeft = this.project(-hw, 0, -hd);
      const backRight = this.project(hw, 0, -hd);
      const backLeftTop = this.project(-hw, this.room.height, -hd);
      const backRightTop = this.project(hw, this.room.height, -hd);
      this.polygon([backLeft, backRight, backRightTop, backLeftTop], this.colors.sage, this.colors.eucalyptus);

      const sideBottom = this.project(-hw, 0, hd);
      const sideTop = this.project(-hw, this.room.height, hd);
      this.polygon([backLeft, sideBottom, sideTop, backLeftTop], this.colors.sand, this.colors.eucalyptus);

      ctx.fillStyle = this.colors.olive;
      ctx.font = `${Math.max(12, this.canvas.width / 95)}px system-ui, sans-serif`;
      ctx.fillText(`${this.room.width.toFixed(1)} m × ${this.room.depth.toFixed(1)} m × ${this.room.height.toFixed(1)} m`, floor[3].x + 10, floor[3].y + 24);
    }

    drawPrism(obj, fill = obj.color) {
      const hw = obj.width / 2;
      const hd = obj.depth / 2;
      const baseLocal = [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]];
      const base = baseLocal.map(([x,z]) => {
        const p = this.localPoint(obj,x,z);
        return this.project(p.x,0,p.z);
      });
      const top = baseLocal.map(([x,z]) => {
        const p = this.localPoint(obj,x,z);
        return this.project(p.x,obj.height,p.z);
      });
      this.polygon([base[1],base[2],top[2],top[1]], this.shade(fill,-14));
      this.polygon([base[2],base[3],top[3],top[2]], this.shade(fill,-24));
      this.polygon(top, fill, this.colors.sand);
      return this.project(obj.x,obj.height,obj.z);
    }

    shade(hex, amount) {
      const raw = hex.replace('#','');
      if (raw.length !== 6) return hex;
      const num = parseInt(raw,16);
      const r = this.clamp((num >> 16) + amount,0,255);
      const g = this.clamp(((num >> 8) & 255) + amount,0,255);
      const b = this.clamp((num & 255) + amount,0,255);
      return `rgb(${r}, ${g}, ${b})`;
    }

    drawPlant(obj) {
      const pot = {...obj, width: obj.width * .55, depth: obj.depth * .55, height: .32, color: this.colors.taupe};
      const top = this.drawPrism(pot, pot.color);
      const ctx = this.ctx;
      const stemTop = this.project(obj.x, obj.height * .78, obj.z);
      ctx.strokeStyle = this.colors.olive;
      ctx.lineWidth = Math.max(2, this.canvas.width / 600);
      ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(stemTop.x, stemTop.y); ctx.stroke();
      const size = Math.max(10, this.metrics().scale * .23);
      [[this.colors.sage,0,0],[this.colors.sage,-.55,-.15],[this.colors.sage,.55,-.05],[this.colors.sage,0,.48]].forEach(([color,dx,dy]) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(stemTop.x + Number(dx)*size, stemTop.y + Number(dy)*size, size*.52, size*.32, -.45, 0, Math.PI*2);
        ctx.fill();
      });
      return stemTop;
    }

    drawLight(obj) {
      const ctx = this.ctx;
      const base = {...obj, width: .34, depth: .34, height: .08, color: this.colors.taupe};
      this.drawPrism(base, base.color);
      const bottom = this.project(obj.x,.08,obj.z);
      const top = this.project(obj.x,obj.height,obj.z);
      ctx.strokeStyle = this.colors.olive;
      ctx.lineWidth = Math.max(2,this.canvas.width/700);
      ctx.beginPath(); ctx.moveTo(bottom.x,bottom.y); ctx.lineTo(top.x,top.y); ctx.stroke();
      const lamp = this.project(obj.x,obj.height-.08,obj.z);
      const coneFloor = this.project(obj.x,0,obj.z);
      const radius = Math.max(18, this.metrics().scale * (.36 + Math.min(obj.watts,60)/180));
      ctx.save();
      ctx.fillStyle = this.colors.sand;
      ctx.beginPath();
      ctx.moveTo(lamp.x,lamp.y);
      ctx.lineTo(coneFloor.x-radius,coneFloor.y);
      ctx.lineTo(coneFloor.x+radius,coneFloor.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = this.colors.olive;
      ctx.beginPath(); ctx.arc(lamp.x,lamp.y,Math.max(6,this.metrics().scale*.08),0,Math.PI*2); ctx.fill();
      return lamp;
    }

    drawWindow(obj) {
      const p = this.project(obj.x,obj.height*.6,obj.z);
      const ctx = this.ctx;
      const scale = this.metrics().scale;
      const w = obj.width * scale * .45;
      const h = obj.height * scale * .42;
      ctx.fillStyle = this.colors.sand;
      ctx.fillRect(p.x-w/2,p.y-h,w,h);
      ctx.strokeStyle = this.colors.sand;
      ctx.strokeRect(p.x-w/2,p.y-h,w,h);
      ctx.beginPath(); ctx.moveTo(p.x,p.y-h);ctx.lineTo(p.x,p.y);ctx.moveTo(p.x-w/2,p.y-h/2);ctx.lineTo(p.x+w/2,p.y-h/2);ctx.stroke();
      return p;
    }

    drawObject(obj) {
      let anchor;
      if (obj.kind === 'plant') anchor = this.drawPlant(obj);
      else if (obj.kind === 'window') anchor = this.drawWindow(obj);
      else if (['light','floor-light','pendant','shelf-light'].includes(obj.kind)) anchor = this.drawLight(obj);
      else anchor = this.drawPrism(obj);

      obj.screen = {x: anchor.x, y: anchor.y};
      if (obj.image) {
        this.preloadImage(obj.image);
        const img = this.productImages.get(obj.image);
        if (img?.complete) {
          const size = Math.max(24, Math.min(46, this.canvas.width / 28));
          this.ctx.save();
          this.ctx.globalAlpha = .94;
          this.ctx.fillStyle = this.colors.cream;
          this.ctx.fillRect(anchor.x-size/2,anchor.y-size-12,size,size);
          try { this.ctx.drawImage(img,anchor.x-size/2+2,anchor.y-size-10,size-4,size-4); } catch {}
          this.ctx.restore();
        }
      }

      if (obj.id === this.selectedId) {
        const radius = Math.max(18,this.metrics().scale*.24);
        const floor = this.project(obj.x,0,obj.z);
        this.ctx.strokeStyle = this.colors.olive;
        this.ctx.lineWidth = Math.max(2,this.canvas.width/700);
        this.ctx.setLineDash([7,5]);
        this.ctx.beginPath(); this.ctx.arc(floor.x,floor.y,radius,0,Math.PI*2); this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      this.ctx.fillStyle = this.colors.olive;
      this.ctx.font = `600 ${Math.max(10,this.canvas.width/125)}px system-ui, sans-serif`;
      const label = obj.title.length > 28 ? `${obj.title.slice(0,27)}…` : obj.title;
      const labelWidth = this.ctx.measureText(label).width;
      const labelHeight = Math.max(10,this.canvas.width/125);
      this.ctx.fillStyle = this.colors.cream;
      this.ctx.fillRect(anchor.x + 5, anchor.y - labelHeight - 7, labelWidth + 6, labelHeight + 7);
      this.ctx.fillStyle = this.colors.olive;
      this.ctx.fillText(label, anchor.x + 8, anchor.y - 4);
    }

    draw() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      const gradient = ctx.createLinearGradient(0,0,0,this.canvas.height);
      gradient.addColorStop(0,this.colors.cream);
      gradient.addColorStop(1,this.colors.sand);
      ctx.fillStyle = gradient;
      ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      this.drawRoom();

      const sorted = [...this.objects].sort((a,b) => {
        const pa = this.project(a.x,0,a.z);
        const pb = this.project(b.x,0,b.z);
        return pa.y - pb.y;
      });
      sorted.forEach((obj) => this.drawObject(obj));
      this.updateSelection();
    }

    pointerPosition(event) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
        y: (event.clientY - rect.top) * (this.canvas.height / rect.height)
      };
    }

    hitTest(point) {
      let best = null;
      let bestDistance = Infinity;
      this.objects.forEach((obj) => {
        const p = obj.screen || this.project(obj.x,obj.height,obj.z);
        const distance = Math.hypot(point.x-p.x,point.y-p.y);
        const threshold = Math.max(28,this.metrics().scale*.35);
        if (distance < threshold && distance < bestDistance) {
          best = obj;
          bestDistance = distance;
        }
      });
      return best;
    }

    pointerDown(event) {
      const point = this.pointerPosition(event);
      const obj = this.hitTest(point);
      if (!obj) {
        this.selectedId = null;
        this.draw();
        return;
      }
      this.selectedId = obj.id;
      this.drag = {last: point, id: obj.id};
      this.canvas.setPointerCapture?.(event.pointerId);
      this.draw();
    }

    pointerMove(event) {
      if (!this.drag) return;
      const obj = this.objects.find((item) => item.id === this.drag.id);
      if (!obj) return;
      const point = this.pointerPosition(event);
      const dx = point.x - this.drag.last.x;
      const dy = point.y - this.drag.last.y;
      const {scale} = this.metrics();
      const a = this.camera * Math.PI / 180;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const dxr = dx / scale;
      const dzr = dy / (scale * .48);
      obj.x += dxr * c + dzr * s;
      obj.z += -dxr * s + dzr * c;
      this.clampObject(obj);
      this.drag.last = point;
      this.draw();
      this.updateSummary();
    }

    pointerUp() {
      if (this.drag) this.save();
      this.drag = null;
    }

    selected() {
      return this.objects.find((obj) => obj.id === this.selectedId) || null;
    }

    rotateSelected(delta) {
      const obj = this.selected();
      if (!obj) return;
      obj.rotation = (obj.rotation + delta + 360) % 360;
      this.save();
      this.draw();
    }

    deleteSelected() {
      if (!this.selectedId) return;
      this.objects = this.objects.filter((obj) => obj.id !== this.selectedId);
      this.selectedId = null;
      this.save();
      this.draw();
      this.updateSummary();
    }

    duplicateSelected() {
      const obj = this.selected();
      if (!obj) return;
      const copy = {...obj, id: ++this.objectId, x: obj.x + .25, z: obj.z + .25};
      delete copy.screen;
      this.clampObject(copy);
      this.objects.push(copy);
      this.selectedId = copy.id;
      this.save();
      this.draw();
      this.updateSummary();
    }

    updateSelection() {
      const panel = this.querySelector('[data-selection]');
      const obj = this.selected();
      const select = this.querySelector('[data-object-select]');
      if (select) {
        const signature = this.objects.map(item => item.id + ':' + item.title).join('|');
        if (select.dataset.signature !== signature) {
          select.replaceChildren(...this.objects.map(item => new Option(item.title, String(item.id))));
          select.dataset.signature = signature;
        }
        select.value = String(this.selectedId || '');
      }
      this.querySelectorAll('[data-position]').forEach(input => {
        input.disabled = !obj;
        if (obj && document.activeElement !== input) input.value = obj[input.dataset.position].toFixed(1);
      });
      if (!panel) return;
      panel.hidden = !obj;
      if (!obj) return;
      const title = panel.querySelector('[data-selection-title]');
      const meta = panel.querySelector('[data-selection-meta]');
      if (title) title.textContent = obj.title;
      if (meta) {
        const parts = [`${obj.x.toFixed(1)} × ${obj.z.toFixed(1)} m`, `${obj.rotation}°`];
        if (obj.watts) parts.push(`${obj.watts} W`);
        meta.textContent = parts.join(' · ');
      }
    }

    formatMoney(cents) {
      try {
        return new Intl.NumberFormat(this.locale,{style:'currency',currency:this.currency}).format(cents/100);
      } catch {
        return `${(cents/100).toFixed(2)} €`;
      }
    }

    updateSummary() {
      const productObjects = this.objects.filter((obj) => obj.variantId);
      const total = productObjects.reduce((sum,obj) => sum + Number(obj.price || 0),0);
      const watts = productObjects.reduce((sum,obj) => sum + Number(obj.watts || 0),0);
      const area = Math.max(.1,this.room.width*this.room.depth);
      const count = this.querySelector('[data-summary-count]');
      const price = this.querySelector('[data-summary-price]');
      const power = this.querySelector('[data-summary-watts]');
      const density = this.querySelector('[data-summary-density]');
      const cart = this.querySelector('[data-add-setup]');
      if (count) count.textContent = String(this.objects.length);
      if (price) price.textContent = productObjects.length ? this.formatMoney(total) : '—';
      if (power) power.textContent = `${Math.round(watts)} W`;
      if (density) density.textContent = `${(watts/area).toFixed(1)} W/m²`;
      if (cart) cart.disabled = productObjects.length === 0;
      this.dispatchEvent(new CustomEvent('room:summary', {detail: {objects: this.objects.map(({screen, ...obj}) => obj)}}));
    }

    async addSetupToCart() {
      const button = this.querySelector('[data-add-setup]');
      const status = this.querySelector('[data-builder-status]');
      const products = this.objects.filter((obj) => obj.variantId);
      if (!products.length || !button) return;
      const grouped = new Map();
      products.forEach((obj) => grouped.set(obj.variantId,(grouped.get(obj.variantId)||0)+1));
      const items = [...grouped.entries()].map(([id,quantity]) => ({id,quantity}));
      button.disabled = true;
      if (status) status.textContent = '';
      try {
        const response = await fetch(this.dataset.cartAddUrl || '/cart/add.js',{
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body:JSON.stringify({items})
        });
        if (!response.ok) throw new Error('cart');
        if (status) status.textContent = this.dataset.addedLabel || '';
        window.setTimeout(() => {
          window.location.href = this.dataset.cartUrl || '/cart';
        },500);
      } catch {
        if (status) status.textContent = this.dataset.errorLabel || '';
        button.disabled = false;
      }
    }

    save() {
      try {
        localStorage.setItem(this.dataset.storageKey || 'leafer-interieur-room-v1',JSON.stringify({
          room:this.room,
          camera:this.camera,
          objects:this.objects.map(({screen,...obj}) => obj),
          objectId:this.objectId
        }));
      } catch {}
    }

    restore() {
      try {
        const raw = localStorage.getItem(this.dataset.storageKey || 'leafer-interieur-room-v1');
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved?.room) {
          for (const key of ['width','depth','height']) {
            if (Number.isFinite(saved.room[key])) this.room[key] = this.clamp(saved.room[key], 2, key === 'height' ? 5 : 12);
          }
          ['width','depth','height'].forEach((key) => {
            const input = this.querySelector(`[data-room-${key}]`);
            if (input) input.value = this.room[key];
          });
        }
        if (Number.isFinite(saved?.camera)) this.camera = saved.camera;
        if (Array.isArray(saved?.objects)) {
          this.objects = saved.objects.slice(0,40).filter(obj => ['x','z','width','depth','height','rotation'].every(key => Number.isFinite(obj[key]))).map(obj => {
            obj.color = obj.kind === 'plant' ? this.colors.sage : obj.kind === 'window' ? this.colors.eucalyptus : this.colors.taupe;
            if (obj.variantId) {
              const option = [...this.querySelectorAll('[data-builder-product-select] option')].find(item => item.value === String(obj.variantId));
              if (!option) return null;
              obj.price = Number(option.dataset.price || 0); obj.url = option.dataset.url || '';
            }
            return obj;
          }).filter(Boolean);
          this.objects.forEach((obj) => this.preloadImage(obj.image));
        }
        this.objectId = Math.max(0, ...this.objects.map(obj => Number(obj.id) || 0));
      } catch {}
    }

    reset() {
      try { localStorage.removeItem(this.dataset.storageKey || 'leafer-interieur-room-v1'); } catch {}
      this.room = {width:4.2,depth:3.2,height:2.5};
      this.camera = -35;
      this.objects = [];
      this.selectedId = null;
      this.objectId = 0;
      ['width','depth','height'].forEach((key) => {
        const input = this.querySelector(`[data-room-${key}]`);
        if (input) input.value = this.room[key];
      });
      this.addPrimitive('plant',-.75,.2);
      this.addPrimitive('plant',.55,.55);
      this.save();
      this.draw();
      this.updateSummary();
    }
  }

  if (!customElements.get('interieur-room-builder')) {
    customElements.define('interieur-room-builder',InterieurRoomBuilder);
  }
