import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { safeCrop, filterCrops, parseMonth, monthRange, type Crop } from '../shared/calendar.ts'
const reviewed = JSON.parse(readFileSync(new URL('../deployment/reviewed-crops.json', import.meta.url), 'utf8'))
const crops: Crop[] = reviewed.map((raw: unknown) => {
  const crop = safeCrop(raw)
  assert.ok(crop, 'every reviewed row must satisfy the public data contract')
  return crop
})
test('thirty sourced crops have separate sowing, planting and flowering windows', () => {
  assert.equal(crops.length, 30)
  assert.equal(new Set(crops.map(c=>c.slug)).size, 30)
  assert.deepEqual(crops.find(c=>c.slug==='erdbeere')?.timing.sow_outdoors, [])
  assert.ok(crops.filter(c=>c.category==='flowers').every(c=>c.timing.harvest_kind==='flowering'))
})
test('month input rejects fractional, repeated, malformed and out of range queries', () => {
  for(const value of ['0','13','1.5','01','1e1','-1','NaN','',undefined,['3','4']]) assert.equal(parseMonth(value), 0)
  assert.equal(parseMonth('12'),12)
})
test('filters intersect search, category, month and cultivation phase', () => {
  assert.deepEqual(filterCrops(crops,{month:3,category:'vegetables',search:'Tomato',phase:'start_indoor'}).map(c=>c.slug),['tomate'])
  assert.equal(filterCrops(crops,{month:3,category:'vegetables',search:'Tomate',phase:'transplant_outdoors'}).length,0)
  assert.deepEqual(filterCrops(crops,{month:0,category:'',search:'MÖHRE'}).map(c=>c.slug),['moehre'])
  assert.equal(filterCrops(crops,{month:0,category:'',search:''}).length,30)
})
test('discontinuous months remain distinct in the displayed range',()=>{
  assert.equal(monthRange([3,4,8,9],'de'),'Mär–Apr, Aug–Sep')
  assert.equal(monthRange([], 'en'),'—')
})
test('public serialization rejects incomplete data and excludes internal fields',()=>{
  assert.equal(safeCrop({...reviewed[0],source_refs:[]}),null)
  assert.equal(safeCrop({...reviewed[0],timing:{...reviewed[0].timing,start_indoor:[13]}}),null)
  assert.equal(safeCrop({...reviewed[0],source_refs:[{title:'bad',publisher:'bad',url:'javascript:alert(1)'}]}),null)
  const result=safeCrop({...reviewed[0],review_status:'verified',approved_at:'internal',private_note:'private'})!
  assert.equal('review_status' in result,false)
  assert.equal('private_note' in result,false)
})
