(()=>{'use strict';
function setup(root){if(root.dataset.bound)return;root.dataset.bound='yes';
const scene=root.querySelector('.leaf-ecosystems__explorer');
function selectRegion(id){if(!['mittelamerika','boreal','sahara'].includes(id))return;
 scene.dataset.activeRegion=id;
 root.querySelectorAll('[data-leaf-region]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.leafRegion===id)));
 root.querySelectorAll('[data-leaf-story]').forEach(panel=>{panel.hidden=panel.dataset.leafStory!==id});
 const globe=document.getElementById('leaf-nature-explorer');
 const matching=globe?.shadowRoot?.querySelector('#regions button[data-id="'+id+'"]');
 if(matching)matching.click();}
function selectLayer(id){if(!['plants','roots','conditions'].includes(id))return;
 scene.dataset.activeLayer=id;
 root.querySelectorAll('[data-leaf-layer]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.leafLayer===id)));
 root.querySelectorAll('[data-leaf-text]').forEach(panel=>{panel.hidden=panel.dataset.leafText!==id});}
root.querySelectorAll('[data-leaf-region]').forEach(button=>button.addEventListener('click',()=>selectRegion(button.dataset.leafRegion)));
root.querySelectorAll('[data-leaf-layer]').forEach(button=>button.addEventListener('click',()=>selectLayer(button.dataset.leafLayer)));
selectLayer('plants');selectRegion('mittelamerika');
}
function init(){document.querySelectorAll('[data-leaf-ecosystems]').forEach(setup)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
document.addEventListener('shopify:section:load',init);
})();
