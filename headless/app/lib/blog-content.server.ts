import {parseFragment, serialize} from 'parse5';
import type {DefaultTreeAdapterMap} from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Parent = DefaultTreeAdapterMap['parentNode'];
type Element = DefaultTreeAdapterMap['element'];
export type ArticleHeading = {id:string; label:string; level:2|3};
const OMIT = new Set(['script','style','link','meta','base','object','embed','iframe','template']);
const ATTRS = new Set(['id','class','role','title','href','src','srcset','sizes','alt','width','height','target','rel','open','colspan','rowspan','scope','datetime','action','method','type','name','value','placeholder','for','checked','selected','disabled','min','max','step','tabindex']);
function isElement(node:Node):node is Element {return 'tagName' in node;}
function text(node:Node):string {
  if(node.nodeName==='#text')return (node as DefaultTreeAdapterMap['textNode']).value;
  return 'childNodes' in node?node.childNodes.map(text).join(' '):'';
}
function set(node:Element,name:string,value:string){
  const a=node.attrs.find(a=>a.name===name);if(a)a.value=value;else node.attrs.push({name,value});
}
function safeUrl(value:string,media=false){
  const clean=Array.from(value).filter(char=>char.charCodeAt(0)>32 && char.charCodeAt(0)!==127).join('');
  return /^(?:https?:\/\/|\/|#)/i.test(clean)||(!media&&/^(?:mailto:|tel:)/i.test(clean));
}
/** Shared server-side presentation. Published facts and asset URLs are not rewritten. */
export function prepareBlogContent(source:string){
  const root=parseFragment(source),ids=new Set<string>(),headings:ArticleHeading[]=[];
  function collect(parent:Parent){for(const n of parent.childNodes){if(isElement(n)){const id=n.attrs.find(a=>a.name==='id')?.value;if(id)ids.add(id);}if('childNodes' in n)collect(n);}}
  collect(root);
  function walk(parent:Parent){
    parent.childNodes=parent.childNodes.filter(n=>!isElement(n)||!OMIT.has(n.tagName));
    for(const node of parent.childNodes){
      if(!isElement(node))continue;
      // Imported Liquid styling must not escape the shared Headless design system.
      node.attrs=node.attrs.filter(a=>node.namespaceURI==='http://www.w3.org/2000/svg' ? !/^on/i.test(a.name) && a.name!=='style' : ATTRS.has(a.name)||a.name.startsWith('aria-')||a.name.startsWith('data-'));
      for(const name of ['href','src','action']){
        const attr=node.attrs.find(a=>a.name===name);
        if(attr&&!safeUrl(attr.value,name==='src'))node.attrs=node.attrs.filter(a=>a!==attr);
      }
      if(node.tagName==='h1'){node.tagName='h2';node.nodeName='h2';}
      if(node.tagName==='h2'||node.tagName==='h3'){
        const label=text(node).replace(/\s+/g,' ').trim();
        if(label){
          let id=node.attrs.find(a=>a.name==='id')?.value;
          if(!id){const base='article-'+label.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');id=base;let suffix=2;while(ids.has(id))id=base+'-'+suffix++;set(node,'id',id);ids.add(id);}
          headings.push({id,label,level:node.tagName==='h2'?2:3});
        }
      }
      if(node.tagName==='img'){set(node,'loading','lazy');set(node,'decoding','async');}
      if(node.tagName==='a'&&node.attrs.some(a=>a.name==='target'&&a.value==='_blank'))set(node,'rel','noopener noreferrer');
      if('childNodes' in node)walk(node);
    }
  }
  walk(root);
  const words=text(root).trim().split(/\s+/).filter(Boolean).length;
  return {html:serialize(root),headings,readingMinutes:Math.max(1,Math.ceil(words/220))};
}
