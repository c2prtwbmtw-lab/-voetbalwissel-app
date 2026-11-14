const DEFAULT=['Johan','Joe','Jan','Safouane','Levi','Brenn','Kyan','Sem'];
const KEY='voetbalwissel-v5';
const DURATIONS={'40':{total:40,periods:4,minutes:10,label:'O8 / O9 / O10'},'60q':{total:60,periods:4,minutes:15,label:'O11 / O12'},'60h':{total:60,periods:2,minutes:30,label:'O13'},'70':{total:70,periods:2,minutes:35,label:'O14 / O15'},'80':{total:80,periods:2,minutes:40,label:'O16 / O17'},'90':{total:90,periods:2,minutes:45,label:'O18 / O19 / Senioren'}};
const durationInfo=()=>DURATIONS[String(state.duration)]||DURATIONS['40'];
const totalMinutes=()=>durationInfo().total;
const nextBreak=(elapsed)=>{const d=durationInfo(),segment=d.minutes*60;return Math.floor(elapsed/segment+1)*segment;};
const $=id=>document.getElementById(id);
let state={match:1,elapsed:0,running:false,format:6,interval:5,duration:40,names:[...DEFAULT],sound:true,manualBench:[],startingKeeper:null,fieldOrder:[],history:{},halftime:false,scores:{},defenders:null};
try{const old=JSON.parse(localStorage.getItem(KEY)||'null');if(old)state={...state,...old,running:false};else{const prev=JSON.parse(localStorage.getItem('voetbalwissel-v4')||localStorage.getItem('voetbalwissel-v3')||localStorage.getItem('voetbalwissel-v1')||'null');if(prev){state={...state,...prev,running:false,halftime:false};}}}catch(e){}
const save=()=>localStorage.setItem(KEY,JSON.stringify({...state,running:false}));
if(!state.scores||typeof state.scores!=='object')state.scores={};
const defenders=()=>Array.isArray(state.defenders)?state.defenders.filter(i=>Number.isInteger(i)&&i>=0&&i<count()):state.names.map((nm,i)=>/^(joe|johan|kyan|jan)$/i.test(nm.trim())?i:-1).filter(i=>i>=0);
const currentScore=()=>state.scores[state.match]||{home:0,away:0};
const baseCount=()=>state.format;
const count=()=>state.names.length;
const slots=()=>Math.ceil(totalMinutes()/state.interval);
const validBench=()=>state.manualBench.length===count()-state.format&&new Set(state.manualBench).size===state.manualBench.length&&state.manualBench.every(i=>i>=0&&i<count());
const firstKeeper=()=>Number.isInteger(state.startingKeeper)&&state.startingKeeper>=0&&state.startingKeeper<count()&&!state.manualBench.includes(state.startingKeeper)?state.startingKeeper:null;
const currentSlot=()=>Math.min(slots()-1,Math.floor(state.elapsed/(state.interval*60)));
const name=i=>state.names[i]||`Speler ${i+1}`;
const time=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
// Versioned schedules prevent old, uneven cached rotations from being reused.
const scheduleKey=()=>['balanced-v5-roles',state.match,state.format,state.interval,state.duration,state.names.join('|'),state.manualBench.join(','),state.startingKeeper,state.fieldOrder.join(','),defenders().join(',')].join(':');
function build(){
 const n=count(),bs=n-state.format,arr=[],played=Array(n).fill(0),lastBench=Array(n).fill(-99),def=new Set(defenders());
 // Start with the first-match lineup, but move the opening substitutes on by
 // two players for each new match. Do not reapply the same manual bench.
 const order=Array.from({length:n},(_,i)=>i);
 if(validBench()){
  const initial=[...state.manualBench];
  const rest=order.filter(i=>!initial.includes(i));
  order.splice(0,n,...initial,...rest);
 }else if(n===8&&state.format===6){order.splice(0,n,6,7,0,1,2,3,4,5);}
 const start=(2*(state.match-1))%n;
 const rotation=Array.from({length:n},(_,i)=>order[(start+i)%n]);
 // Keeper shifts by the number of 10-minute turns played in each match.
 const keeperBase=firstKeeper()??0;
 const keeperOrder=Array.from({length:n},(_,i)=>(keeperBase+i)%n);
 const keeperOffset=(state.match-1)*Math.ceil(totalMinutes()/10);
 for(let i=0;i<slots();i++){
  const minute=i*state.interval,weight=Math.min(state.interval,totalMinutes()-minute);
  const keeper=keeperOrder[(keeperOffset+Math.floor(minute/10))%n];
  let bench=[];
  if(bs>0){
   const candidates=rotation.filter(j=>j!==keeper);
   const availableDef=candidates.filter(j=>def.has(j));
   const availableAtt=candidates.filter(j=>!def.has(j));
   // Bij 6 tegen 6 met twee wissels: normaal 1 verdediger en 1 aanvaller.
   // Als een verdediger keept: laat twee aanvallers wisselen (als mogelijk).
   // Bij grotere banken: verdeel verdedigers/aanvallers naar verhouding.
   const targetDef=bs===2?(def.has(keeper)?0:1):Math.round(bs*availableDef.length/candidates.length);
   const minDef=Math.max(0,bs-availableAtt.length),maxDef=Math.min(bs,availableDef.length);
   const desiredDef=Math.min(maxDef,Math.max(minDef,targetDef));
   const ranked=(group)=>group.slice().sort((a,b)=>{
    const score=j=>played[j]*100+(lastBench[j]===i-1?10000:0)+(i===0?rotation.indexOf(j)*2:0);
    return score(b)-score(a)||rotation.indexOf(a)-rotation.indexOf(b);
   });
   if(i===0){
    // Zorg dat de startbank per wedstrijd doorschuift, binnen de positieverdeling.
    const rotate=(group)=>group.slice().sort((a,b)=>rotation.indexOf(a)-rotation.indexOf(b));
    bench=[...rotate(availableDef).slice(0,desiredDef),...rotate(availableAtt).slice(0,bs-desiredDef)];
   }else{
    bench=[...ranked(availableDef).slice(0,desiredDef),...ranked(availableAtt).slice(0,bs-desiredDef)];
   }
   // Handmatig gekozen beginbank alleen gebruiken wanneer de rolverdeling klopt.
   if(i===0&&state.match===1&&validBench()&&!state.manualBench.includes(keeper)&&state.manualBench.filter(j=>def.has(j)).length===desiredDef){
    bench=[...state.manualBench];
   }
  }
  const field=Array.from({length:n},(_,j)=>j).filter(j=>j!==keeper&&!bench.includes(j));
  if(i===0&&state.match===1&&state.fieldOrder?.length)field.sort((a,b)=>{const ai=state.fieldOrder.indexOf(a),bi=state.fieldOrder.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi);});
  arr.push({keeper,bench,field});
  for(let j=0;j<n;j++){if(!bench.includes(j))played[j]+=weight;else lastBench[j]=i;}
 }
 return arr;
}
function schedule(){const k=scheduleKey();if(!state.history[k]){state.history={};state.history[k]=build();}return state.history[k];}
function beep(){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=880;g.gain.value=.13;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.3);setTimeout(()=>ctx.close(),500);}catch(e){}navigator.vibrate?.([180,100,180]);}
function notify(msg){$('notice').textContent=msg;$('notice').classList.add('show');setTimeout(()=>$('notice').classList.remove('show'),4000);beep();}
function positions(){const f=state.format;if(f===6)return [{x:50,y:87,r:'K'},{x:17,y:65,r:'V'},{x:50,y:65,r:'V'},{x:83,y:65,r:'V'},{x:33,y:29,r:'A'},{x:67,y:29,r:'A'}];if(f===8)return [{x:50,y:89,r:'K'},{x:18,y:70,r:'V'},{x:50,y:72,r:'V'},{x:82,y:70,r:'V'},{x:30,y:48,r:'M'},{x:70,y:48,r:'M'},{x:32,y:24,r:'A'},{x:68,y:24,r:'A'}];return [{x:50,y:91,r:'K'},{x:12,y:73,r:'V'},{x:37,y:77,r:'V'},{x:63,y:77,r:'V'},{x:88,y:73,r:'V'},{x:25,y:51,r:'M'},{x:50,y:55,r:'M'},{x:75,y:51,r:'M'},{x:18,y:25,r:'A'},{x:50,y:20,r:'A'},{x:82,y:25,r:'A'}];}
function render(){
 const rows=schedule(),s=rows[currentSlot()];
 $('matchNumber').textContent=state.match;
 const score=currentScore();$('homeScore').textContent=score.home;$('awayScore').textContent=score.away;
 $('groupName').textContent=`${state.format} tegen ${state.format} · ${count()} spelers · ${count()-state.format} wissels`;
 $('clock').textContent=time(state.elapsed);$('secondHalf').hidden=!state.halftime;$('period').textContent=`${currentSlot()*state.interval}–${Math.min(totalMinutes(),(currentSlot()+1)*state.interval)} min`;
 $('play').textContent=state.running?'⏸ Pauze':state.halftime?'Rust — volgende periode starten':'▶ Start';$('progress').style.width=`${state.elapsed/(totalMinutes()*60)*100}%`;
 $('keeperName').textContent=name(s.keeper);$('bench').textContent=s.bench.map(name).join(' · ')||'Geen wisselspelers';
 const ids=[s.keeper,...s.field];$('playersOnField').innerHTML=positions().map((p,i)=>`<div class="player ${i===0?'keeper':''}" data-pos="${i}" data-player="${ids[i]}" style="left:${p.x}%;top:${p.y}%"><span>${p.r}</span><b></b></div>`).join('');
 [...$('playersOnField').children].forEach((el,i)=>el.querySelector('b').textContent=name(ids[i]));
 $('slots').innerHTML=rows.map((r,i)=>`<button class="slot ${i===currentSlot()?'selected':''}" data-slot="${i}">${i*state.interval}–${Math.min(totalMinutes(),(i+1)*state.interval)}</button>`).join('');
 $('tableBody').innerHTML=rows.map((r,i)=>`<tr class="${i===currentSlot()?'active':''}" data-slot="${i}"><td>${i*state.interval}–${Math.min(totalMinutes(),(i+1)*state.interval)}</td><td>${name(r.keeper)}</td><td>${r.bench.map(name).join(' · ')||'—'} <button type="button" class="edit-slot" data-edit="${i}" aria-label="Wijzig tijdvak ${i+1}">✎ Wijzig</button></td></tr>`).join('');
 $('prevMatch').disabled=state.match===1;$('sound').checked=state.sound;$('format').value=String(state.format);$('interval').value=String(state.interval);$('interval5').classList.toggle('selected',state.interval===5);$('interval10').classList.toggle('selected',state.interval===10);
 $('duration').value=String(state.duration);renderBenchPicker();renderDefenderPicker();
 $('playerCount').textContent=`${count()} spelers (minimaal ${state.format}, maximaal ${state.format+6})`;
 $('summary').textContent=`${durationInfo().label}: ${durationInfo().periods} × ${durationInfo().minutes} minuten (${totalMinutes()} minuten), met rust tussen de periodes. Precies ${state.format} spelers op het veld, inclusief keeper. Keeper om de 10 minuten; veldspelers om de ${state.interval} minuten.`;
}
function isBreakPoint(t){const d=durationInfo(),segment=d.minutes*60;return t>0&&t<totalMinutes()*60&&t%segment===0;}
function resetClock(){state.elapsed=0;state.running=false;state.halftime=false;save();render();}
function adjustFormat(f){state.format=f;state.names=state.names.slice(0,f+6);while(state.names.length<f)state.names.push(`Speler ${state.names.length+1}`);state.manualBench=[];state.startingKeeper=null;state.fieldOrder=[];state.defenders=null;state.history={};resetClock();}
$('format').addEventListener('change',e=>adjustFormat(Number(e.target.value)));
$('duration').addEventListener('change',e=>{state.duration=e.target.value;state.history={};resetClock();});
$('interval').addEventListener('change',e=>{state.interval=Number(e.target.value);state.history={};resetClock();});
for(const minutes of [5,10])$('interval'+minutes).addEventListener('click',()=>{if(state.interval===minutes)return;state.interval=minutes;state.history={};resetClock();});
$('addPlayer').addEventListener('click',()=>{if(count()>=state.format+6)return alert('Maximaal 6 extra wisselspelers.');state.names.push(`Speler ${count()+1}`);state.manualBench=[];state.startingKeeper=null;state.fieldOrder=[];state.history={};save();render();openNames();});
$('removePlayer').addEventListener('click',()=>{if(count()<=state.format)return alert('Er moeten genoeg spelers voor het veld zijn.');state.names.pop();state.defenders=defenders().filter(i=>i<state.names.length);state.manualBench=[];state.startingKeeper=null;state.fieldOrder=[];state.history={};save();render();openNames();});
function openNames(){$('namesPanel').hidden=false;$('nameFields').innerHTML='';state.names.forEach((v,i)=>{const label=document.createElement('label');label.textContent=`Speler ${i+1}`;const inp=document.createElement('input');inp.value=v;inp.maxLength=30;label.appendChild(inp);$('nameFields').appendChild(label);});}
$('editNames').addEventListener('click',()=>{$('namesPanel').hidden?openNames():$('namesPanel').hidden=true;});
$('saveNames').addEventListener('click',()=>{state.names=[...$('nameFields').querySelectorAll('input')].map((x,i)=>x.value.trim()||`Speler ${i+1}`);$('namesPanel').hidden=true;state.history={};save();render();});
$('slots').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b){state.elapsed=Number(b.dataset.slot)*state.interval*60;state.running=false;state.halftime=isBreakPoint(state.elapsed);save();render();}});
$('tableBody').addEventListener('click',e=>{
 const edit=e.target.closest('[data-edit]');if(edit){openSlotEditor(Number(edit.dataset.edit));return;}
 const b=e.target.closest('[data-slot]');if(b){state.elapsed=Number(b.dataset.slot)*state.interval*60;state.running=false;state.halftime=isBreakPoint(state.elapsed);save();render();}
});
let editingSlot=null;
function openSlotEditor(i){
 editingSlot=i;const r=schedule()[i];
 $('slotEditorTitle').textContent=`Tijdvak ${i*state.interval}–${Math.min(totalMinutes(),(i+1)*state.interval)} minuten`;
 const sel=$('editKeeper');sel.innerHTML='';state.names.forEach((nm,j)=>{const o=document.createElement('option');o.value=j;o.textContent=nm;sel.appendChild(o);});sel.value=String(r.keeper);
 $('editBench').innerHTML='';state.names.forEach((nm,j)=>{const label=document.createElement('label');label.className='bench-option';const cb=document.createElement('input');cb.type='checkbox';cb.value=j;cb.checked=r.bench.includes(j);label.append(cb,document.createTextNode(' '+nm));$('editBench').appendChild(label);});
 $('slotEditor').hidden=false;
}
$('closeSlotEditor').addEventListener('click',()=>{$('slotEditor').hidden=true;editingSlot=null;});
$('saveSlotEditor').addEventListener('click',()=>{
 if(editingSlot===null)return;
 const keeper=Number($('editKeeper').value),bench=[...$('editBench').querySelectorAll('input:checked')].map(x=>Number(x.value));
 if(bench.length!==count()-state.format)return alert(`Kies precies ${count()-state.format} wisselspelers.`);
 if(bench.includes(keeper))return alert('De keeper mag niet op de wisselbank staan.');
 if(state.format===6&&count()-state.format===2){const required=defenders().includes(keeper)?0:1;if(bench.filter(i=>defenders().includes(i)).length!==required)return alert(required===0?'Als een verdediger keept, kies twee aanvallers op de bank.':'Kies één verdediger en één aanvaller op de bank.');}
 const r=schedule()[editingSlot],oldField=r.field,oldKeeper=r.keeper;
 r.keeper=keeper;r.bench=bench;
 r.field=[...oldField,oldKeeper,...Array.from({length:count()},(_,j)=>j)].filter((j,i,arr)=>j!==keeper&&!bench.includes(j)&&arr.indexOf(j)===i).slice(0,state.format-1);
 state.history[scheduleKey()]=schedule();
 $('slotEditor').hidden=true;editingSlot=null;save();render();
});
$('play').addEventListener('click',()=>{if(state.halftime){state.halftime=false;state.running=true;}else{if(state.elapsed>=totalMinutes()*60)state.elapsed=0;state.running=!state.running;}lastTick=Date.now();save();render();});
$('secondHalf').addEventListener('click',()=>{state.halftime=false;state.running=true;lastTick=Date.now();save();render();});
$('reset').addEventListener('click',()=>{if(confirm('Wedstrijdklok opnieuw beginnen?'))resetClock();});
$('nextMatch').addEventListener('click',()=>{state.match++;resetClock();});$('prevMatch').addEventListener('click',()=>{if(state.match>1){state.match--;resetClock();}});
function renderDefenderPicker(){
 const selected=new Set(defenders());
 $('defenderChoices').innerHTML='';
 state.names.forEach((nm,i)=>{
  const label=document.createElement('label');label.className='bench-option';
  const cb=document.createElement('input');cb.type='checkbox';cb.checked=selected.has(i);
  cb.addEventListener('change',()=>{
   const next=new Set(defenders());if(cb.checked)next.add(i);else next.delete(i);
   state.defenders=[...next];state.history={};save();render();
  });
  label.append(cb,document.createTextNode(' '+nm));$('defenderChoices').appendChild(label);
 });
}
function changeScore(side,delta){
 const s={...currentScore()};s[side]=Math.max(0,(Number(s[side])||0)+delta);
 state.scores[state.match]=s;save();render();
}
$('homePlus').addEventListener('click',()=>changeScore('home',1));
$('homeMinus').addEventListener('click',()=>changeScore('home',-1));
$('awayPlus').addEventListener('click',()=>changeScore('away',1));
$('awayMinus').addEventListener('click',()=>changeScore('away',-1));
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
 if(state.format===6&&bs===2){const required=defenders().includes(state.startingKeeper)?0:1;if(state.manualBench.filter(i=>defenders().includes(i)).length!==required)return alert(required===0?'Bij een verdedigende keeper beginnen twee aanvallers op de bank.':'Kies één verdediger en één aanvaller voor de beginwisselbank.');}
 state.fieldOrder=[];state.history={};resetClock();
});
// Two taps exchange field positions; touch and mouse dragging also work.
let selectedPosition=null,dragging=null;
function exchange(a,b){
 if(a===b){selectedPosition=null;render();return;}
 const current=schedule()[currentSlot()];
 const ids=[current.keeper,...current.field];
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=ids.length||b>=ids.length)return;
 [ids[a],ids[b]]=[ids[b],ids[a]];
 // Only change the selected time slot. Future substitutions and bench assignments stay intact.
 current.keeper=ids[0];
 current.field=ids.slice(1);
 if(currentSlot()===0){state.startingKeeper=ids[0];state.fieldOrder=ids.slice(1);state.history[scheduleKey()]=schedule();}
 selectedPosition=null;
 save();render();
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
 lastTick=state.running ? lastTick + Math.floor((now-lastTick)/1000)*1000 : now;
},200);
window.addEventListener('pagehide',()=>{state.running=false;save();});
render();if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
