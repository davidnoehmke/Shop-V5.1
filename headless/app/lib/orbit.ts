export type OrbitCamera = {lat: number; lon: number; zoom: number};
const rad = Math.PI / 180;
export function boundedCamera(camera: OrbitCamera): OrbitCamera {
  return {lat: Math.max(-89, Math.min(89, camera.lat)), lon: ((camera.lon + 180) % 360 + 360) % 360 - 180,
    zoom: Math.max(1, Math.min(24, camera.zoom))};
}
export function orbitPoint(lat: number, lon: number, camera: OrbitCamera) {
  const a = lat * rad, b = camera.lat * rad, delta = (lon - camera.lon) * rad;
  const z = Math.sin(a)*Math.sin(b) + Math.cos(a)*Math.cos(b)*Math.cos(delta);
  if (z < 0) return null;
  const x = Math.cos(a)*Math.sin(delta) * camera.zoom;
  const y = (Math.sin(a)*Math.cos(b) - Math.cos(a)*Math.sin(b)*Math.cos(delta)) * camera.zoom;
  return Math.abs(x) < 1 && Math.abs(y) < 1 ? {left: (50 + 50*x) + '%', top: (50 - 50*y) + '%'} : null;
}
export function orbitLocation(x: number, y: number, camera: OrbitCamera) {
  x /= camera.zoom; y /= camera.zoom;
  if (x*x + y*y > 1) return null;
  const z = Math.sqrt(Math.max(0, 1 - x*x - y*y)), a = camera.lat * rad;
  return boundedCamera({lat: Math.asin(y*Math.cos(a) + z*Math.sin(a)) / rad,
    lon: camera.lon + Math.atan2(x, z*Math.cos(a) - y*Math.sin(a)) / rad, zoom: camera.zoom});
}
export function approachCamera(current: OrbitCamera, target: OrbitCamera, amount: number) {
  const longitude = ((target.lon - current.lon + 540) % 360) - 180;
  return boundedCamera({lat: current.lat + (target.lat - current.lat)*amount,
    lon: current.lon + longitude*amount, zoom: current.zoom + (target.zoom - current.zoom)*amount});
}
