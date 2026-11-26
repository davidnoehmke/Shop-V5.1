import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
const crops=JSON.parse(readFileSync(new URL('../deployment/reviewed-crops.json',import.meta.url),'utf8')).map(c=>({...c,updated_at:'2026-11-26T02:00:00Z'}))
createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:3501')
  if(url.pathname==='/health'){res.end('ready');return}
  if(url.pathname!=='/rest/v1/grow_calendar_crops'||url.searchParams.get('is_published')!=='eq.true'||url.searchParams.get('review_status')!=='eq.verified'){
    res.writeHead(400);res.end('Expected published and verified filters');return
  }
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(crops))
}).listen(3501,'127.0.0.1')
