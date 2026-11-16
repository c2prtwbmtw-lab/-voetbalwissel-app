// Optional update. Never replace the app during an active match without consent.
(function(){
  if(!('serviceWorker' in navigator))return;
  let registration, accepted=false, reloading=false;
  const banner=document.getElementById('updateBanner');
  const action=document.getElementById('updateNow');
  const later=document.getElementById('updateLater');
  function offer(){if(registration&&registration.waiting&&!accepted)banner.hidden=false;}
  action.addEventListener('click',()=>{
    if(!registration||!registration.waiting)return;
    if(typeof state!=='undefined'&&state.running){
      alert('Pauzeer of beëindig eerst de wedstrijd voordat je bijwerkt.');return;
    }
    accepted=true;
    banner.hidden=true;
    registration.waiting.postMessage({type:'SKIP_WAITING'});
  });
  later.addEventListener('click',()=>{banner.hidden=true;});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(accepted&&!reloading){reloading=true;location.reload();}
  });
  window.addEventListener('load',async()=>{
    try{
      registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      offer();
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        if(worker)worker.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller)offer();
        });
      });
      if(navigator.onLine)registration.update().catch(()=>{});
      window.addEventListener('focus',()=>{if(navigator.onLine)registration.update().catch(()=>{});});
      document.addEventListener('visibilitychange',()=>{
        if(!document.hidden&&navigator.onLine)registration.update().catch(()=>{});
      });
    }catch(e){/* App continues offline even when update checks fail. */}
  });
})();
