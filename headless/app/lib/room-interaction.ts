export type Vector3 = [number, number, number];
export type RoomView = {yaw: number; pitch: number; distance: number};
export type PlantPosition = Vector3;
export const INITIAL_PLANT_POSITIONS: PlantPosition[] = [
  [-2, 0, 1.15], [-2, 0, -1.5], [1.35, 1.22, -1.75],
  [2, 1.92, -1.75], [2.1, 0, 1.1], [-0.4, 0, -1.2],
];
export const dot = (a: Vector3, b: Vector3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross = (a: Vector3, b: Vector3): Vector3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const normal = (a: Vector3): Vector3 => {const n=Math.hypot(...a)||1;return a.map(v=>v/n) as Vector3;};
export function roomCamera(view: RoomView) {
  const eye: Vector3 = [Math.sin(view.yaw)*Math.cos(view.pitch)*view.distance, 1.35+Math.sin(view.pitch)*view.distance, Math.cos(view.yaw)*Math.cos(view.pitch)*view.distance];
  const backwards=normal([eye[0],eye[1]-1.05,eye[2]]);
  const right=normal(cross([0,1,0],backwards));
  return {eye, backwards, right, up:cross(backwards,right), f:1/Math.tan(Math.PI/5.5)};
}
export function roomRay(view: RoomView, x: number, y: number, aspect: number) {
  const camera=roomCamera(view);
  const direction=normal(camera.backwards.map((v,i)=>-v+camera.right[i]*x*aspect/camera.f+camera.up[i]*y/camera.f) as Vector3);
  return {origin:camera.eye,direction};
}
export function intersectPlantPlane(ray: ReturnType<typeof roomRay>, height: number): Vector3 | null {
  if(Math.abs(ray.direction[1])<0.00001)return null;
  const t=(height-ray.origin[1])/ray.direction[1];
  return t>0?ray.origin.map((v,i)=>v+t*ray.direction[i]) as Vector3:null;
}
export function pickPlant(ray: ReturnType<typeof roomRay>, positions: PlantPosition[], count: number): number | null {
  let nearest=Infinity,selected:number|null=null;
  positions.slice(0,count).forEach(([x,y,z],index)=>{
    const min=[x-.47,y,z-.47],max=[x+.47,y+1,z+.47];
    let near=0,far=Infinity;
    for(let axis=0;axis<3;axis++){
      const d=ray.direction[axis],o=ray.origin[axis];
      if(Math.abs(d)<0.00001){if(o<min[axis]||o>max[axis])return;continue;}
      const a=(min[axis]-o)/d,b=(max[axis]-o)/d;
      near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    }
    if(near<=far&&near<nearest){nearest=near;selected=index;}
  });
  return selected;
}
export function boundedPlant(position: PlantPosition): PlantPosition {
  return [Math.max(-2.85,Math.min(2.85,position[0])),position[1],Math.max(-2.25,Math.min(2.25,position[2]))];
}
