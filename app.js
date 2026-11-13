const DEFAULT=['Johan','Joe','Jan','Safouane','Levi','Brenn','Kyan','Sem'];
const KEY='voetbalwissel-v5';
const DURATIONS={'40':{total:40,periods:4,minutes:10,label:'O8 / O9 / O10'},'60q':{total:60,periods:4,minutes:15,label:'O11 / O12'},'60h':{total:60,periods:2,minutes:30,label:'O13'},'70':{total:70,periods:2,minutes:35,label:'O14 / O15'},'80':{total:80,periods:2,minutes:40,label:'O16 / O17'},'90':{total:90,periods:2,minutes:45,label:'O18 / O19 / Senioren'}};
const durationInfo=()=>DURATIONS[String(state.duration)]||DURATIONS['40'];
const totalMinutes=()=>durationInfo().total;
const nextBreak=(elapsed)=>{const d=durationInfo(),segment=d.minutes*60;return Math.floor(elapsed/segment+1)*segment;};
const $=id=>document.getElementById(id);
let state={match:1,elapsed:0,running:false,format:6,interval:5,duration:40,names:[...DEFAULT],sound:true,manualBench:[],startingKeeper:null,fieldOrder:[],history:{},halftime:false};
try{const old=JSON.parse(localStorage.getItem(KEY)||'null');if(old)state={...state,...old,running:false};else{const prev=JSON.parse(localStorage.getItem('voetbalwissel-v4')||localStorage.getItem('voetbalwissel-v3')||localStorage.getItem('voetbalwissel-v1')||'null');if(prev){state={...state,...prev,running:false,halftime:false};}}}catch(e){}
const save=()=>localStorage.setItem(KEY,JSON.stringify({...state,running:false}));
const baseCount=()=>state.format;
const count=()=>state.names.length;
const slots=()=>Math.ceil(totalMinutes()/state.interval);
const validBench=()=>state.manualBench.length===count()-state.format&&new Set(state.manualBench).size===state.manualBench.length&&state.manualBench.every(i=>i>=0&&i<count());
const firstKeeper=()=>Number.isInteger(state.startingKeeper)&&state.startingKeeper>=0&&state.startingKeeper<count()&&!state.manualBench.includes(state.startingKeeper)?state.startingKeeper:null;
const currentSlot=()=>Math.min(slots()-1,Math.floor(state.elapsed/(state.interval*60)));
const name=i=>state.names[i]||`Speler ${i+1}`;
const time=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
function build(){
 const n=count(),on=baseCount(),benchSize=n-on,arr=[];
 // The keeper stays in goal for 10 minutes, independent of field substitution frequency.
 for(let i=0;i<slots();i++){
  const minute=i*state.interval;
  const keeper= i===0&&firstKeeper()!==null?firstKeeper():(Math.floor(minute/10+state.match-1)%n);
  const order=Array.from({length:n},(_,j)=>(j+Math.floor(i*benchSize)+(state.match-1)*2)%n);
  const bench=[];
  if(i===0&&validBench()){bench.push(...state.manualBench);}
  else for(const p of order){if(p!==keeper&&bench.length<benchSize)bench.push(p);}
  const field=Array.from({length:n},(_,j)=>j).filter(p=>p!==keeper&&!bench.includes(p));
  if(i===0&&state.fieldOrder?.length){field.sort((a,b)=>{const ai=state.fieldOrder.indexOf(a),bi=state.fieldOrder.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi);});}
  arr.push({keeper,bench,field});
 }
 return arr;
}
function schedule(){const k=[state.match,state.format,state.interval,state.duration,state.names.length,state.manualBench.join(','),state.startingKeeper,state.fieldOrder.join(',')].join(':');if(!state.history[k])state.history[k]=build();return state.history[k];}
function beep(){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=880;g.gain.value=.13;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.3);setTimeout(()=>ctx.close(),500);}catch(e){}navigator.vibrate?.([180,100,180]);}
function notify(msg){$('notice').textContent=msg;$('notice').classList.add('show');setTimeout(()=>$('notice').classList.remove('show'),4000);beep();}
function positions(){const f=state.format;if(f===6)return [{x:50,y:87,r:'K'},{x:17,y:65,r:'V'},{x:50,y:65,r:'V'},{x:83,y:65,r:'V'},{x:33,y:29,r:'A'},{x:67,y:29,r:'A'}];if(f===8)return [{x:50,y:89,r:'K'},{x:18,y:70,r:'V'},{x:50,y:72,r:'V'},{x:82,y:70,r:'V'},{x:30,y:48,r:'M'},{x:70,y:48,r:'M'},{x:32,y:24,r:'A'},{x:68,y:24,r:'A'}];return [{x:50,y:91,r:'K'},{x:12,y:73,r:'V'},{x:37,y:77,r:'V'},{x:63,y:77,r:'V'},{x:88,y:73,r:'V'},{x:25,y:51,r:'M'},{x:50,y:55,r:'M'},{x:75,y:51,r:'M'},{x:18,y:25,r:'A'},{x:50,y:20,r:'A'},{x:82,y:25,r:'A'}];}
function render(){
 const rows=schedule(),s=rows[currentSlot()];
 $('matchNumber').textContent=state.match;
 $('groupName').textContent=`${state.format} tegen ${state.format} · ${count()} spelers · ${count()-state.format} wissels`;
 $('clock').textContent=time(state.elapsed);$('secondHalf').hidden=!state.halftime;$('period').textContent=`${currentSlot()*state.interval}–${Math.min(totalMinutes(),(currentSlot()+1)*state.interval)} min`;
 $('play').textContent=state.running?'⏸ Pauze':state.halftime?'Rust — volgende periode starten':'▶ Start';$('progress').style.width=`${state.elapsed/(totalMinutes()*60)*100}%`;
 $('keeperName').textContent=name(s.keeper);$('bench').textContent=s.bench.map(name).join(' · ')||'Geen wisselspelers';
 const ids=[s.keeper,...s.field];$('playersOnField').innerHTML=positions().map((p,i)=>`<div class="player ${i===0?'keeper':''}" data-pos="${i}" data-player="${ids[i]}" style="left:${p.x}%;top:${p.y}%"><span>${p.r}</span><b></b></div>`).join('');
 [...$('playersOnField').children].forEach((el,i)=>el.querySelector('b').textContent=name(ids[i]));
 $('slots').innerHTML=rows.map((r,i)=>`<button class="slot ${i===currentSlot()?'selected':''}" data-slot="${i}">${i*state.interval}–${Math.min(totalMinutes(),(i+1)*state.interval)}</button>`).join('');
 $('tableBody').innerHTML=rows.map((r,i)=>`<tr class="${i===currentSlot()?'active':''}" data-slot="${i}"><td>${i*state.interval}–${Math.min(totalMinutes(),(i+1)*state.interval)}</td><td>${name(r.keeper)}</td><td>${r.bench.map(name).join(' · ')||'—'}</td></tr>`).join('');
 $('prevMatch').disabled=state.match===1;$('sound').checked=state.sound;$('format').value=String(state.format);$('interval').value=String(state.interval);
 $('duration').value=String(state.duration);renderBenchPicker();
 $('playerCount').textContent=`${count()} spelers (minimaal ${state.format}, maximaal ${state.format+6})`;
 $('summary').textContent=`${durationInfo().label}: ${durationInfo().periods} × ${durationInfo().minutes} minuten (${totalMinutes()} minuten), met rust tussen de periodes. Precies ${state.format} spelers op het veld, inclusief keeper. Keeper om de 10 minuten; veldspelers om de ${state.interval} minuten.`;
}
function isBreakPoint(t){const d=durationInfo(),segment=d.minutes*60;return t>0&&t<totalMinutes()*60&&t%segment===0;}
function resetClock(){state.elapsed=0;state.running=false;state.halftime=false;save();render();}
function adjustFormat(f){state.format=f;state.names=state.names.slice(0,f+6);while(state.names.length<f)state.names.push(`Speler ${state.names.length+1}`);state.manualBench=[];state.startingKeeper=null;state.fieldOrder=[];state.history={};resetClock();}
$('format').addEventListener('change',e=>adjustFormat(Number(e.target.value)));
$('duration').addEventListener('change',e=>{state.duration=e.target.value;state.history={};resetClock();});
$('interval').addEventListener('change',e=>{state.interval=Number(e.target.value);state.history={};resetClock();});
$('addPlayer').addEventListener('click',()=>{if(count()>=state.format+6)return alert('Maximaal 6 extra wisselspelers.');state.names.push(`Speler ${count()+1}`);state.manualBench=[];state.startingKeeper=null;state.fieldOrder=[];state.history={};save();render();openNames();});
$('removePlayer').addEventListener('click',()=>{if(count()<=state.format)return alert('Er moeten genoeg spelers voor het veld zijn.');state.names.pop();state.manualBench=[];state.startingKeeper=null;state.fieldOrder=[];state.history={};save();render();openNames();});
function openNames(){$('namesPanel').hidden=false;$('nameFields').innerHTML='';state.names.forEach((v,i)=>{const label=document.createElement('label');label.textContent=`Speler ${i+1}`;const inp=document.createElement('input');inp.value=v;inp.maxLength=30;label.appendChild(inp);$('nameFields').appendChild(label);});}
$('editNames').addEventListener('click',()=>{$('namesPanel').hidden?openNames():$('namesPanel').hidden=true;});
$('saveNames').addEventListener('click',()=>{state.names=[...$('nameFields').querySelectorAll('input')].map((x,i)=>x.value.trim()||`Speler ${i+1}`);$('namesPanel').hidden=true;state.history={};save();render();});
$('slots').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b){state.elapsed=Number(b.dataset.slot)*state.interval*60;state.running=false;state.halftime=isBreakPoint(state.elapsed);save();render();}});
$('tableBody').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b){state.elapsed=Number(b.dataset.slot)*state.interval*60;state.running=false;state.halftime=isBreakPoint(state.elapsed);save();render();}});
$('play').addEventListener('click',()=>{if(state.halftime){state.halftime=false;state.running=true;}else{if(state.elapsed>=totalMinutes()*60)state.elapsed=0;state.running=!state.running;}lastTick=Date.now();save();render();});
$('secondHalf').addEventListener('click',()=>{state.halftime=false;state.running=true;lastTick=Date.now();save();render();});
$('reset').addEventListener('click',()=>{if(confirm('Wedstrijdklok opnieuw beginnen?'))resetClock();});
$('nextMatch').addEventListener('click',()=>{state.match++;resetClock();});$('prevMatch').addEventListener('click',()=>{if(state.match>1){state.match--;resetClock();}});
$('sound').addEventListener('change',e=>{state.sound=e.target.checked;save();});
$('copy').addEventListener('click',async()=>{const txt=`Wedstrijd ${state.match} · ${state.format} tegen ${state.format} · ${durationInfo().periods} × ${durationInfo().minutes} minuten\n`+schedule().map((s,i)=>`${i*state.interval}-${Math.min(totalMinutes(),(i+1)*state.interval)} | Keeper: ${name(s.keeper)} | Veld: ${s.field.map(name).join(', ')} | Bank: ${s.bench.map(name).join(', ')}`).join('\n');try{await navigator.clipboard.writeText(txt);notify('Schema gekopieerd');}catch(e){prompt('Kopieer schema',txt);}});

function renderBenchPicker(){
 const bs=count()-state.format;
 if(!validBench()){state.manualBench=[];}
 $('benchChoices').innerHTML='';
 state.names.forEach((nm,i)=>{
  const label=document.createElement('label');label.className='bench-option';
  const cb=document.createElement('input');cb.type='checkbox';cb.value=i;cb.checked=state.manualBench.includes(i);
  cb.addEventListener('change',()=>{
   if(cb.checked){if(state.manualBench.length>=bs){cb.checked=false;return alert(`Je kunt maximaal ${bs} wisselspelers kiezen.`);}state.manualBench.push(i);}
   else state.manualBench=state.manualBench.filter(x=>x!==i);
   const keeper=$('startingKeeper'),old=keeper.value;keeper.innerHTML='';state.names.forEach((v,j)=>{if(!state.manualBench.includes(j)){const o=document.createElement('option');o.value=j;o.textContent=v;keeper.appendChild(o);}});if([...keeper.options].some(o=>o.value===old))keeper.value=old;updatePickerStatus();
  });label.append(cb,document.createTextNode(' '+nm));$('benchChoices').appendChild(label);
 });
 const keeper=$('startingKeeper');keeper.innerHTML='';
 state.names.forEach((nm,i)=>{if(!state.manualBench.includes(i)){const opt=document.createElement('option');opt.value=i;opt.textContent=nm;keeper.appendChild(opt);}});
 keeper.value=String(firstKeeper()??schedule()[0].keeper);
 updatePickerStatus();
}
function updatePickerStatus(){
 const bs=count()-state.format,sel=state.manualBench.length;
 $('lineupStatus').textContent=bs===0?'Geen wisselspelers nodig.':`${sel} van ${bs} beginwisselspelers geselecteerd`;
}
$('applyLineup').addEventListener('click',()=>{
 const bs=count()-state.format;
 if(state.manualBench.length!==bs)return alert(`Selecteer precies ${bs} wisselspelers.`);
 state.startingKeeper=Number($('startingKeeper').value);
 if(state.manualBench.includes(state.startingKeeper))return alert('De keeper mag niet op de wisselbank staan.');
 state.fieldOrder=[];state.history={};resetClock();
});
// Two taps exchange field positions; touch and mouse dragging also work.
let selectedPosition=null,dragging=null;
function exchange(a,b){
 if(a===b){render();return;}
 if(currentSlot()!==0)return alert('Pas de beginopstelling aan in het eerste tijdvak (0 minuten).');
 const first=schedule()[0],ids=[first.keeper,...first.field];
 [ids[a],ids[b]]=[ids[b],ids[a]];
 state.startingKeeper=ids[0];state.fieldOrder=ids.slice(1);
 state.history={};save();render();
}
$('playersOnField').addEventListener('click',e=>{
 const el=e.target.closest('.player');if(!el||dragging?.moved)return;
 const pos=Number(el.dataset.pos);
 if(selectedPosition===null){selectedPosition=pos;el.classList.add('chosen');}
 else {const a=selectedPosition;selectedPosition=null;exchange(a,pos);}
});
$('playersOnField').addEventListener('pointerdown',e=>{
 const el=e.target.closest('.player');if(!el)return;
 dragging={pos:Number(el.dataset.pos),x:e.clientX,y:e.clientY,moved:false};
});
$('playersOnField').addEventListener('pointerup',e=>{
 if(!dragging)return;
 const d=dragging;const dx=e.clientX-d.x,dy=e.clientY-d.y;
 if(Math.hypot(dx,dy)>18){d.moved=true;
  const rect=$('pitch').getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*100,y=(e.clientY-rect.top)/rect.height*100;
  const positionsList=positions();let best=-1,dist=Infinity;
  positionsList.forEach((p,i)=>{const v=(p.x-x)**2+(p.y-y)**2;if(v<dist){dist=v;best=i;}});
  exchange(d.pos,best);selectedPosition=null;
  setTimeout(()=>{dragging=null;},0);
 }else dragging=null;
});
$('playersOnField').addEventListener('pointercancel',()=>{dragging=null;});

let lastTick=Date.now();setInterval(()=>{
 const now=Date.now();
 if(state.running){
  const delta=Math.floor((now-lastTick)/1000);
  if(delta>0){
   const before=state.elapsed,finish=totalMinutes()*60;
   const boundary=nextBreak(before),target=Math.min(finish,before+delta);
   state.elapsed=Math.min(target,boundary);
   const crossed= Math.floor(before/(state.interval*60))<Math.floor(state.elapsed/(state.interval*60));
   if(isBreakPoint(state.elapsed)){
    state.running=false;state.halftime=true;
    const period=Math.round(state.elapsed/(durationInfo().minutes*60));
    notify(`Rust! Periode ${period} afgelopen.`);
   }else if(state.elapsed>=finish){state.running=false;notify('Einde wedstrijd!');}
   else if(crossed)notify(state.elapsed%600===0?'Wissel spelers én keeper!':'Tijd om te wisselen!');
   save();render();
  }
 }
 lastTick=now;
},400);
window.addEventListener('pagehide',()=>{state.running=false;save();});
render();if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
