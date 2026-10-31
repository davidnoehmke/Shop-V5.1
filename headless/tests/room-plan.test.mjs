import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRoomPlan} from '../app/lib/room-plan.ts';

const item = {id:'plant-1',kind:'plant',x:2,y:1,width:.4,depth:.4,rotation:45};
const saved = (items = [item]) => ({version:1,plan:{width:4,depth:3,height:2.5,items}});

test('saved room plans round-trip with plant and catalog identities', () => {
  const value=saved([{...item,plantProfileId:'monstera',productId:'gid://shopify/Product/1'}]);
  const plan=parseRoomPlan(JSON.parse(JSON.stringify(value)));
  assert.equal(plan.items[0].plantProfileId,'monstera');
  assert.equal(plan.items[0].productId,'gid://shopify/Product/1');
  assert.equal(plan.items[0].rotation,45);
});
test('malformed versions, dimensions, duplicate identities and oversized scenes are rejected', () => {
  for (const value of [null, [], {}, {...saved(),version:2},
    {...saved(),plan:{...saved().plan,width:'4'}}, saved([item,item]),
    saved([{...item,x:Infinity}]),saved([{...item,width:0}]),
    saved(Array.from({length:201},(_,n)=>({...item,id:String(n)})))]) {
    assert.equal(parseRoomPlan(value),null);
  }
});
test('import cannot declare an unsupported or missing mounting verified', () => {
  for (const mount of [undefined,'none','invented']) {
    const plan=parseRoomPlan(saved([{...item,mount,mountVerified:true}]));
    assert.equal(plan.items[0].mountVerified,false);
  }
});
