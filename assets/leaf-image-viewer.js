/* Event delegated: reusable for product galleries and editorial homepage. */
(()=>{"use strict";
  if(window.__leafImageViewerInit)return;
  window.__leafImageViewerInit=true;
  let viewer=null,image=null,caption=null,returnFocus=null;
  const createViewer=()=>{
    viewer=document.createElement("dialog");viewer.id="LeafImageViewer";viewer.className="leaf-image-viewer";
    viewer.setAttribute("aria-label","Produktbild in voller Ansicht");
    const close=document.createElement("button");close.type="button";close.className="leaf-image-viewer__close";
    close.setAttribute("aria-label","Bild schließen");close.textContent="×";
    const figure=document.createElement("figure");figure.className="leaf-image-viewer__figure";
    image=document.createElement("img");image.className="leaf-image-viewer__img";image.alt="";
    caption=document.createElement("figcaption");caption.className="leaf-image-viewer__caption";
    figure.append(image,caption);viewer.append(close,figure);document.body.appendChild(viewer);
    close.addEventListener("click",()=>viewer.close());
    viewer.addEventListener("click",e=>{if(e.target===viewer)viewer.close()});
    viewer.addEventListener("close",()=>{image.removeAttribute("src");if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true})});
    return viewer;
  };
  document.addEventListener("click",e=>{
    const trigger=e.target.closest?.("[data-leaf-image-open]");
    if(!trigger)return;
    const src=trigger.dataset.leafImageFull;
    if(!src)return;
    e.preventDefault();
    if(!viewer)createViewer();
    returnFocus=trigger;
    image.src=src;image.alt=trigger.dataset.leafImageAlt||"Produktansicht";
    caption.textContent=trigger.dataset.leafImageAlt||"";
    if(typeof viewer.showModal==="function")viewer.showModal();
    else {viewer.setAttribute("open","");viewer.style.display="flex"}
  });
})();