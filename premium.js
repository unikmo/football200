document.querySelectorAll('[data-menu]').forEach(btn=>btn.addEventListener('click',()=>document.body.classList.toggle('menu-open')));

(function(){
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const configs={
    'verein.html':{
      endpoint:'/api/interest/club',
      keys:['clubName','locationLeague','contactName','email','plannedCapacity','phone'],
      success:'Danke — die Vereinsanfrage wurde im Preview-Backend gespeichert.'
    },
    'unternehmen.html':{
      endpoint:'/api/interest/sponsor',
      keys:['company','city','contactName','email','level','preferredClub','message'],
      success:'Danke — die Sponsorenanfrage wurde im Preview-Backend gespeichert.'
    }
  };

  document.querySelectorAll('[data-demo-form]').forEach(form=>{
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const success=form.querySelector('.success');
      const note=form.querySelector('.form-note');
      const config=configs[page];

      // Child/family applications remain intentionally non-persistent in this demo.
      if(!config){
        if(success) success.style.display='block';
        return;
      }

      const controls=Array.from(form.querySelectorAll('input,select,textarea'));
      const payload={website:''};
      config.keys.forEach((key,index)=>{payload[key]=controls[index]?.value||'';});
      if(page==='unternehmen.html') payload.addOn='';
      if(page==='verein.html') payload.goals='';

      const submit=form.querySelector('button[type="submit"]');
      if(submit) submit.disabled=true;
      if(success) success.style.display='none';
      if(note) note.textContent='Wird sicher übertragen …';

      try{
        const response=await fetch(config.endpoint,{
          method:'POST',
          headers:{'content-type':'application/json'},
          body:JSON.stringify(payload)
        });
        const body=await response.json().catch(()=>({}));
        if(!response.ok||!body.ok) throw new Error(body.error||'REQUEST_FAILED');
        if(success){success.textContent=config.success;success.style.display='block';}
        if(note) note.textContent='Preview-Demo · keine Zahlung und kein Produktionsbetrieb';
        form.reset();
      }catch(error){
        if(note) note.textContent='Übertragung fehlgeschlagen. Bitte später erneut versuchen.';
      }finally{
        if(submit) submit.disabled=false;
      }
    });
  });
})();
