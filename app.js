const DEFAULT=['Johan','Joe','Jan','Safouane','Levi','Brenn','Kyan','Sem'];
const KEY='voetbalwissel-v3';
const $=id=>document.getElementById(id);
let state={match:1,elapsed:0,running:false,format:6,interval:5,duration:40,names:[...DEFAULT],sound:true,manualBench:[],history:{}};
try{const old=JSON.parse(localStorage.getItem(KEY)||'null');if(old)state={...state,...old,running:false};else{const prev=JSON.parse(localStorage.getItem('voetbalwissel-v1')||'null');if(prev){state.names=prev.names||state.names;state.match=prev.match||1;state.sound=prev.sound!==false;}}}catch(e){}
const save=()=>localStorage.setItem(KEY,JSON.stringify({...state,running:false}));
const baseCount=()=>state.format;
const count=()=>state.names.length;
const slots=()=>Math.ceil(state.duration/state.interval);
const currentSlot=()=>Math.min(slots()-1,Math.floor(state.elapsed/(state.interval*60)));
const name=i=>state.names[i]||`Speler ${i+1}`;
const time=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
function build(){
 const n=count(),on=baseCount(),benchSize=n-on,arr=[];
 // The keeper stays in goal for 10 minutes, independent of field substitution frequency.
 for(let i=0;i<slots();i++){
  const minute=i*state.interval;
  const keeper=Math.floor(minute/10+state.match-1)%n;
  const order=Array.from({length:n},(_,j)=>(j+Math.floor(i*benchSize)+(state.match-1)*2)%n);
  const bench=[];
  for(const p of order){if(p!==keeper&&bench.length<benchSize)bench.push(p);}
  const field=Array.from({length:n},(_,j)=>j).filter(p=>p!==keeper&&!bench.includes(p));
  arr.push({keeper,bench,field});
 }
 return arr;
}
function schedule(){const k=[state.match,state.format,state.interval,state.duration,state.names.length,state.manualBench.join(',')].join(':');if(!state.history[k])state.history[k]=build();return state.history[k];}
function beep(){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=880;g.gain.value=.13;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.3);setTimeout(()=>ctx.close(),500);}catch(e){}navigator.vibrate?.([180,100,180]);}
function notify(msg){$('notice').textContent=msg;$('notice').classList.add('show');setTimeout(()=>$('notice').classList.remove('show'),4000);beep();}
function positions(){const f=state.format;if(f===6)return [{x:50,y:87,r:'K'},{x:17,y:65,r:'V'},{x:50,y:65,r:'V'},{x:83,y:65,r:'V'},{x:33,y:29,r:'A'},{x:67,y:29,r:'A'}];if(f===8)return [{x:50,y:89,r:'K'},{x:18,y:70,r:'V'},{x:50,y:72,r:'V'},{x:82,y:70,r:'V'},{x:30,y:48,r:'M'},{x:70,y:48,r:'M'},{x:32,y:24,r:'A'},{x:68,y:24,r:'A'}];return [{x:50,y:91,r:'K'},{x:12,y:73,r:'V'},{x:37,y:77,r:'V'},{x:63,y:77,r:'V'},{x:88,y:73,r:'V'},{x:25,y:51,r:'M'},{x:50,y:55,r:'M'},{x:75,y:51,r:'M'},{x:18,y:25,r:'A'},{x:50,y:20,r:'A'},{x:82,y:25,r:'A'}];}
function render(){
 const rows=schedule(),s=rows[currentSlot()];
 $('matchNumber').textContent=state.match;
 $('groupName').textContent=`${state.format} tegen ${state.format} · ${count()} spelers · ${count()-state.format} wissels`;
 $('clock').textContent=time(state.elapsed);$('period').textContent=`${currentSlot()*state.interval}–${Math.min(state.duration,(currentSlot()+1)*state.interval)} min`;
 $('play').textContent=state.running?'⏸ Pauze':'▶ Start';$('progress').style.width=`${state.elapsed/(state.duration*60)*100}%`;
 $('keeperName').textContent=name(s.keeper);$('bench').textContent=s.bench.map(name).join(' · ')||'Geen wisselspelers';
 const ids=[s.keeper,...s.field];$('playersOnField').innerHTML=positions().map((p,i)=>`<div class="player ${i===0?'keeper':''}" style="left:${p.x}%;top:${p.y}%"><span>${p.r}</span><b></b></div>`).join('');
 [...$('playersOnField').children].forEach((el,i)=>el.querySelector('b').textContent=name(ids[i]));
 $('slots').innerHTML=rows.map((r,i)=>`<button class="slot ${i===currentSlot()?'selected':''}" data-slot="${i}">${i*state.interval}–${Math.min(state.duration,(i+1)*state.interval)}</button>`).join('');
 $('tableBody').innerHTML=rows.map((r,i)=>`<tr class="${i===currentSlot()?'active':''}" data-slot="${i}"><td>${i*state.interval}–${Math.min(state.duration,(i+1)*state.interval)}</td><td>${name(r.keeper)}</td><td>${r.bench.map(name).join(' · ')||'—'}</td></tr>`).join('');
 $('prevMatch').disabled=state.match===1;$('sound').checked=state.sound;$('format').value=String(state.format);$('interval').value=String(state.interval);
 $('playerCount').textContent=`${count()} spelers (minimaal ${state.format}, maximaal ${state.format+6})`;
 $('summary').textContent=`Er staan altijd precies ${state.format} spelers op het veld, inclusief keeper. De keeper wisselt om de 10 minuten; veldspelers om de ${state.interval} minuten.`;
}
function resetClock(){state.elapsed=0;state.running=false;save();render();}
function adjustFormat(f){state.format=f;state.names=state.names.slice(0,f+6);while(state.names.length<f)state.names.push(`Speler ${state.names.length+1}`);state.history={};resetClock();}
$('format').addEventListener('change',e=>adjustFormat(Number(e.target.value)));
$('interval').addEventListener('change',e=>{state.interval=Number(e.target.value);state.history={};resetClock();});
$('addPlayer').addEventListener('click',()=>{if(count()>=state.format+6)return alert('Maximaal 6 extra wisselspelers.');state.names.push(`Speler ${count()+1}`);state.history={};save();render();openNames();});
$('removePlayer').addEventListener('click',()=>{if(count()<=state.format)return alert('Er moeten genoeg spelers voor het veld zijn.');state.names.pop();state.history={};save();render();openNames();});
function openNames(){$('namesPanel').hidden=false;$('nameFields').innerHTML='';state.names.forEach((v,i)=>{const label=document.createElement('label');label.textContent=`Speler ${i+1}`;const inp=document.createElement('input');inp.value=v;inp.maxLength=30;label.appendChild(inp);$('nameFields').appendChild(label);});}
$('editNames').addEventListener('click',()=>{$('namesPanel').hidden?openNames():$('namesPanel').hidden=true;});
$('saveNames').addEventListener('click',()=>{state.names=[...$('nameFields').querySelectorAll('input')].map((x,i)=>x.value.trim()||`Speler ${i+1}`);$('namesPanel').hidden=true;state.history={};save();render();});
$('slots').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b){state.elapsed=Number(b.dataset.slot)*state.interval*60;state.running=false;save();render();}});
$('tableBody').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b){state.elapsed=Number(b.dataset.slot)*state.interval*60;state.running=false;save();render();}});
$('play').addEventListener('click',()=>{if(state.elapsed>=state.duration*60)state.elapsed=0;state.running=!state.running;lastTick=Date.now();save();render();});
$('reset').addEventListener('click',()=>{if(confirm('Wedstrijdklok opnieuw beginnen?'))resetClock();});
$('nextMatch').addEventListener('click',()=>{state.match++;resetClock();});$('prevMatch').addEventListener('click',()=>{if(state.match>1){state.match--;resetClock();}});
$('sound').addEventListener('change',e=>{state.sound=e.target.checked;save();});
$('copy').addEventListener('click',async()=>{const txt=`Wedstrijd ${state.match} · ${state.format} tegen ${state.format}\n`+schedule().map((s,i)=>`${i*state.interval}-${Math.min(state.duration,(i+1)*state.interval)} | Keeper: ${name(s.keeper)} | Veld: ${s.field.map(name).join(', ')} | Bank: ${s.bench.map(name).join(', ')}`).join('\n');try{await navigator.clipboard.writeText(txt);notify('Schema gekopieerd');}catch(e){prompt('Kopieer schema',txt);}});
let lastTick=Date.now();setInterval(()=>{const now=Date.now();if(state.running){const delta=Math.floor((now-lastTick)/1000);if(delta>0){const before=state.elapsed;state.elapsed=Math.min(state.duration*60,before+delta);const oldBoundary=Math.floor(before/(state.interval*60)),newBoundary=Math.floor(state.elapsed/(state.interval*60));if(newBoundary>oldBoundary&&state.elapsed<state.duration*60)notify(state.elapsed%600===0?'Wissel spelers én keeper!':'Tijd om te wisselen!');if(state.elapsed>=state.duration*60){state.running=false;notify('Einde wedstrijd!');}save();render();}}lastTick=now;},400);
window.addEventListener('pagehide',()=>{state.running=false;save();});
render();if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
