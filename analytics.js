(function(){
  const dataLayer = window.dataLayer = window.dataLayer || [];
  function clean(value,max=180){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max)}
  function emit(event,detail={}){
    const payload={event:clean(event,80),f200_path:location.pathname,...detail};
    dataLayer.push(payload);
    try{window.dispatchEvent(new CustomEvent('football200:analytics',{detail:payload}))}catch{}
  }
  window.F200Analytics={emit};
  emit('f200_page_view',{f200_title:clean(document.title,160)});
  document.addEventListener('click',event=>{
    const el=event.target.closest('a,button');if(!el)return;
    const href=el.getAttribute('href')||'';let name='f200_cta_click';
    if(/sponsor\/checkout|unternehmen\.html#levels/.test(href))name='f200_sponsor_cta';
    else if(/verein\.html#form/.test(href))name='f200_club_cta';
    else if(/family-plus/.test(href))name='f200_family_plus_cta';
    emit(name,{f200_label:clean(el.textContent,100),f200_target:clean(href,180)});
  });
  document.addEventListener('submit',event=>{
    const form=event.target;if(!(form instanceof HTMLFormElement))return;
    emit('f200_form_submit',{f200_form:clean(form.id||form.getAttribute('name')||location.pathname,100)});
  });
})();
