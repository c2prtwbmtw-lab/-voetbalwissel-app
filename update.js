// Updates are offered but never automatically activate during a match.
(function(){
 if(!('serviceWorker' in navigator))return;
 let registration,accepted=false,reloading=false,dismissed=false;
 const banner=document.getElementById('updateBanner'),action=document.getElementById('updateNow'),later=document.getElementById('updateLater'),indicator=document.getElementById('updateIndicator');
 if(!banner||!action||!later||!indicator)return;
 const waiting=()=>Boolean(registration&&registration.waiting);
 function offer(force=false){
   const available=waiting();
   indicator.classList.toggle('is-available',available);
   indicator.setAttribute('aria-label',available?'Nieuwe versie beschikbaar':'Controleer op updates');
   indicator.title=available?'Nieuwe versie beschikbaar':'Controleer op updates';
   if(available&&(force||!dismissed)&&!accepted)banner.hidden=false;
 }
 action.addEventListener('click',()=>{
   if(!waiting())return;
   if(typeof state!=='undefined'&&state.running){alert('Pauzeer of beëindig eerst de wedstrijd voordat je bijwerkt.');return;}
   accepted=true;banner.hidden=true;registration.waiting.postMessage({type:'SKIP_WAITING'});
 });
 later.addEventListener('click',()=>{dismissed=true;banner.hidden=true;});
 indicator.addEventListener('click',async()=>{
   if(waiting()){dismissed=false;offer(true);return;}
   if(!registration){alert('Updatecontrole wordt gestart. Probeer het zo opnieuw.');return;}
   indicator.classList.add('is-checking');
   try{await registration.update();offer(true);if(!waiting())alert('Er is momenteel geen nieuwe versie klaar.');}
   catch(e){alert('Updatecontrole is nu niet beschikbaar. Probeer het later opnieuw.');}
   finally{indicator.classList.remove('is-checking');}
 });
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(accepted&&!reloading){reloading=true;location.reload();}});
 window.addEventListener('load',async()=>{
   try{
     registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
     offer();
     registration.addEventListener('updatefound',()=>{
       const worker=registration.installing;
       if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offer();});
     });
     if(navigator.onLine)registration.update().catch(()=>{});
     window.addEventListener('focus',()=>{if(navigator.onLine)registration.update().catch(()=>{});});
     document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine)registration.update().catch(()=>{});});
   }catch(e){/* The app continues working offline. */}
 });
})();
