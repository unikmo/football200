document.querySelectorAll('[data-menu]').forEach(btn=>btn.addEventListener('click',()=>document.body.classList.toggle('menu-open')));

(function(){
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();

  document.querySelectorAll('.nav-links').forEach(nav=>{
    const hasSponsors=nav.querySelector('a[href="sponsoren.html"],a[href="/sponsoren.html"]');
    if(hasSponsors) return;
    const link=document.createElement('a');
    link.href='sponsoren.html';
    link.textContent='Sponsoren';
    const before=Array.from(nav.querySelectorAll('a')).find(a=>/kinder/i.test(a.textContent));
    nav.insertBefore(link,before||null);
  });

  if(page==='unternehmen.html'){
    document.querySelectorAll('a[href="#form"]').forEach(link=>{
      link.href='/sponsor/checkout.html';
      if(link.textContent.includes('Sponsor werden')) link.setAttribute('aria-label','Sponsor werden und Stripe Test-Checkout öffnen');
    });
  }

  async function loadSponsorSpotlight(){
    if(page!=='index.html'&&page!=='sponsoren.html') return;
    try{
      const response=await fetch('/api/public/spotlight',{headers:{accept:'application/json'}});
      const body=await response.json();
      const spotlight=response.ok?body.spotlight:null;
      if(!spotlight||!spotlight.company) return;

      if(page==='sponsoren.html'){
        const card=document.querySelector('.spotlight-card');
        if(card){
          const badge=card.querySelector('.spotlight-badge');
          const logo=card.querySelector('.spotlight-logo');
          const kicker=card.querySelector('.kicker');
          const title=card.querySelector('.section-title');
          const copy=card.querySelector('.section-copy');
          const note=card.querySelector('.spotlight-note');
          if(badge) badge.textContent='Sponsor der Woche';
          if(logo){logo.textContent='';const name=document.createElement('strong');name.textContent=spotlight.company;name.style.fontSize='clamp(24px,4vw,42px)';name.style.textAlign='center';logo.append(name)}
          if(kicker) kicker.textContent='Aktueller Sponsor';
          if(title) title.textContent=spotlight.company;
          if(copy) copy.textContent=spotlight.story||`${spotlight.company} unterstützt junge Fans im Football200-Programm.`;
          if(note) note.textContent=[spotlight.city,spotlight.clubName].filter(Boolean).join(' · ');
        }
      }

      if(page==='index.html'){
        const hero=document.querySelector('.hero');
        if(hero&&!document.querySelector('[data-active-spotlight]')){
          const band=document.createElement('a');
          band.href='sponsoren.html#woche';
          band.setAttribute('data-active-spotlight','');
          band.style.cssText='display:flex;align-items:center;justify-content:center;gap:10px;padding:11px 20px;background:#f7f9f1;border-bottom:1px solid #e3e8dd;color:#111a24;text-decoration:none;font-size:13px;font-weight:700;text-align:center';
          const label=document.createElement('span');label.textContent='Sponsor der Woche';label.style.color='#557615';
          const name=document.createElement('strong');name.textContent=spotlight.company;
          const arrow=document.createElement('span');arrow.textContent='→';
          band.append(label,name,arrow);
          hero.insertAdjacentElement('afterend',band);
        }
      }
    }catch{}
  }

  loadSponsorSpotlight();

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
        if(note) note.textContent='Preview-Demo · keine Zahlung aus diesem Kontaktformular';
        form.reset();
      }catch(error){
        if(note) note.textContent='Übertragung fehlgeschlagen. Bitte später erneut versuchen.';
      }finally{
        if(submit) submit.disabled=false;
      }
    });
  });
})();
