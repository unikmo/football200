document.querySelectorAll('[data-menu]').forEach(btn=>btn.addEventListener('click',()=>document.body.classList.toggle('menu-open')));
document.querySelectorAll('[data-demo-form]').forEach(form=>{
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const success=form.querySelector('.success');
    if(success) success.style.display='block';
  });
});
