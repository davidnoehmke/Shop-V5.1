import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roomCamera, roomRay, intersectPlantPlane, pickPlant, boundedPlant, dot} from '../app/lib/room-interaction.ts';
const view={yaw:.9,pitch:.47,distance:10};
function rayTo(point,aspect=1.6){
 const c=roomCamera(view),d=point.map((n,i)=>n-c.eye[i]);
 const depth=-dot(d,c.backwards);
 return roomRay(view,c.f*dot(d,c.right)/depth/aspect,c.f*dot(d,c.up)/depth,aspect);
}
test('dragging uses the visible camera projection and preserves the grab plane',()=>{
 for(const point of [[-2,0,1.15],[2,1.92,-1.75],[1,0,2]]){
 const hit=intersectPlantPlane(rayTo(point),point[1]);
 hit.forEach((v,i)=>assert.ok(Math.abs(v-point[i])<1e-9));
 }
});
test('picking selects an actual plant and empty space leaves camera rotation available',()=>{
 const plants=[[-2,0,1.15],[2,0,-1.5]];
 assert.equal(pickPlant(rayTo([-2,.5,1.15]),plants,2),0);
 assert.equal(pickPlant(rayTo([2,.5,-1.5]),plants,2),1);
 assert.equal(pickPlant(rayTo([2,.5,-1.5]),plants,1),null);
 assert.equal(pickPlant(rayTo([0,0,2]),plants,2),null);
});
test('plant moves stay inside the room and preserve shelf height',()=>{
 assert.deepEqual(boundedPlant([12,1.92,-12]),[2.85,1.92,-2.25]);
 assert.deepEqual(boundedPlant([1,0,1]),[1,0,1]);
});
