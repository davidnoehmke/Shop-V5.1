import {test} from 'node:test';
import assert from 'node:assert/strict';
import {natureHandoff, substratePath} from '../app/lib/nature-handoff.ts';
const region = {slug:'site',title_de:'Standort',explorer_data:{zoom_story:[{id:'soil',station_slug:'soil-site',question_de:'Warum?',source_citations:[{url:'https://example.org'}]}]}};
const station = {slug:'soil-site',region_slug:'site',related_paths:[substratePath]};
test('published learning context survives a valid configurator handoff',()=>{
 assert.deepEqual(natureHandoff([region],[station],'site','soil'), {region:'site',level:'soil',title_de:'Standort',title_en:'Standort',question_de:'Warum?',question_en:'Warum?'});
});
test('unknown stages, unrelated regions and fauna topics cannot create a shop handoff',()=>{
 assert.equal(natureHandoff([region],[station],'site','unknown'),null);
 assert.equal(natureHandoff([region],[{...station,region_slug:'other'}],'site','soil'),null);
 assert.equal(natureHandoff([region],[{...station,related_paths:[]}],'site','soil'),null);
 assert.equal(natureHandoff([{...region,explorer_data:{zoom_story:[{...region.explorer_data.zoom_story[0],source_citations:[]}]}}],[station],'site','soil'),null);
});
