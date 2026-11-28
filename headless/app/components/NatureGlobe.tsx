import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import type {Region} from '~/lib/nature-explorer.server';
import {explorerUrl} from '~/lib/nature-navigation';

const radians = Math.PI / 180;
const size = 320;
const radius = size / 2;
type Camera = {lat: number; lon: number};

function paint(canvas: HTMLCanvasElement, map: ImageData, camera: Camera) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const pixels = ctx.createImageData(size, size);
  const sin = Math.sin(camera.lat * radians);
  const cos = Math.cos(camera.lat * radians);
  for (let row = 0; row < size; row++) {
    const y = (radius - row - .5) / radius;
    for (let col = 0; col < size; col++) {
      const x = (col + .5 - radius) / radius;
      const squared = 1 - x*x - y*y;
      if (squared <= 0) continue;
      const z = Math.sqrt(squared);
      const lat = Math.asin(Math.max(-1, Math.min(1, y*cos + z*sin)));
      const lon = camera.lon * radians + Math.atan2(x, z*cos - y*sin);
      const u = Math.floor((lon / (2*Math.PI) + 1.5) * map.width) % map.width;
      const v = Math.max(0, Math.min(map.height - 1, Math.floor((.5 - lat / Math.PI) * map.height)));
      const from = 4 * (v * map.width + u);
      const to = 4 * (row * size + col);
      const light = .77 + .23 * z;
      for (let channel = 0; channel < 3; channel++) pixels.data[to + channel] = map.data[from + channel] * light;
      pixels.data[to + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

function project(lat: number, lon: number, camera: Camera) {
  const delta = (lon - camera.lon) * radians;
  const a = lat * radians, b = camera.lat * radians;
  const z = Math.sin(a)*Math.sin(b) + Math.cos(a)*Math.cos(b)*Math.cos(delta);
  if (z <= 0) return null;
  return {
    left: (50 + 50 * Math.cos(a) * Math.sin(delta)) + '%',
    top: (50 - 50 * (Math.sin(a)*Math.cos(b) - Math.cos(a)*Math.sin(b)*Math.cos(delta))) + '%',
  };
}

export function NatureGlobe({regions, english}: {regions: Region[]; english: boolean}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{x: number; y: number; camera: Camera} | null>(null);
  const [camera, setCamera] = useState<Camera>({lat: regions[0]?.center_lat ?? 20, lon: regions[0]?.center_lon ?? 0});
  const [texture, setTexture] = useState<ImageData | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const surface = document.createElement('canvas');
      surface.width = img.width;
      surface.height = img.height;
      const ctx = surface.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      setTexture(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.src = '/nature/earth-map.webp';
    return () => {img.onload = null;};
  }, []);
  useEffect(() => {
    if (!texture) return;
    const frame = requestAnimationFrame(() => {if (canvas.current) paint(canvas.current, texture, camera);});
    return () => cancelAnimationFrame(frame);
  }, [camera, texture]);
  function move(lon: number, lat: number) {
    setCamera({lon: ((lon + 180) % 360 + 360) % 360 - 180, lat: Math.min(85, Math.max(-85, lat))});
  }
  return <div className="nature-globe">
    <img src="/nature/earth.webp" alt={english ? 'Western hemisphere' : 'Westliche Hemisphäre'} />
    {texture && <canvas ref={canvas} width={size} height={size} tabIndex={0} role="img"
      aria-label={english ? 'Globe. Drag or use arrow keys to rotate.' : 'Globus. Ziehen oder mit Pfeiltasten drehen.'}
      onPointerDown={e => {drag.current = {x: e.clientX, y: e.clientY, camera}; e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e => {
        if (!drag.current) return;
        const start = drag.current;
        move(start.camera.lon - (e.clientX - start.x) * .5, start.camera.lat + (e.clientY - start.y) * .5);
      }}
      onLostPointerCapture={() => {drag.current = null;}}
      onKeyDown={e => {
        const delta = {ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, 15], ArrowDown: [0, -15]}[e.key];
        if (delta) {e.preventDefault(); move(camera.lon + delta[0], camera.lat + delta[1]);}
      }} />}
    {texture && regions.map(region => {
      const position = project(region.center_lat, region.center_lon, camera);
      return position ? <Link key={region.slug} className="nature-globe__pin" style={position}
        to={explorerUrl(english, region.slug)} aria-label={english && region.title_en || region.title_de}
        title={english && region.title_en || region.title_de} viewTransition><span /></Link> : null;
    })}
  </div>;
}
