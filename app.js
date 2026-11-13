const PLAYERS=['Johan','Joe','Jan','Safouane','Levi','Brenn','Kyan','Sem'];
const ALL_PLAYERS=[...PLAYERS,...Array.from({length:9},(_,i)=>`Speler ${i+9}`)];
const GROUPS=[['Johan','Joe','Jan','Safouane'],['Kyan','Sem','Levi','Brenn']];
const KEY='voetbalwissel-v1';
let state={match:1,slot:0,elapsed:0,running:false,names:[...ALL_PLAYERS],history:{},sound:true,fieldMode:'6',positions:{},switchMinutes:5};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){state={...state,...saved,running:false};}}catch(e){}
state.names=[...ALL_PLAYERS.map((n,i)=>state.names?.[i]||n)];
const $=id=>document.getElementById(id);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}};
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
const shuffle=(a,random)=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function generate(match){
 const keepers=GROUPS[(match-1)%2];
 const offset=Math.floor((match-1)/2)%4;
 const sequence=Array.from({length:8},(_,i)=>keepers[(Math.floor(i/2)+offset)%4]);
 // Every player sits exactly twice, never in consecutive 5-minute slots.
 // Keeper cannot be on the bench during their 10-minute stint.
 const fixed=match===1?['Kyan','Sem']:null;
 const random=rng(918273+match*991);
 const counts=Object.fromEntries(PLAYERS.map(p=>[p,0]));
 const benches=[];
 function dfs(i){
  if(i===8)return PLAYERS.every(p=>counts[p]===2);
  let candidates=[];
  for(let a=0;a<PLAYERS.length;a++)for(let b=a+1;b<PLAYERS.length;b++){
   const pair=[PLAYERS[a],PLAYERS[b]];
   if(fixed&&i===0&&!(pair.includes(fixed[0])&&pair.includes(fixed[1])))continue;
   if(pair.includes(sequence[i])||pair.some(p=>counts[p]>=2))continue;
   if(i>0&&pair.some(p=>benches[i-1].includes(p)))continue;
   if(i===7&&pair.some(p=>benches[0].includes(p)))continue;
   const future=7-i;
   const newCounts={...counts};pair.forEach(p=>newCounts[p]++);
   if(PLAYERS.some(p=>2-newCounts[p]>future))continue;
   candidates.push(pair);
  }
  candidates=shuffle(candidates,random).sort((a,b)=>{
    const score=pair=>pair.reduce((sum,p)=>sum+counts[p]*3,0);
    return score(b)-score(a);
  });
  for(const pair of candidates){benches.push(pair);pair.forEach(p=>counts[p]++);
   if(dfs(i+1))return true;
   pair.forEach(p=>counts[p]--);benches.pop();
  }
  return false;
 }
 if(!dfs(0))throw Error('Geen geldig wisselschema gevonden');
 return Array.from({length:8},(_,i)=>({keeper:sequence[i],bench:benches[i],field:['Joe','Jan','Levi','Safouane','Brenn','Kyan','Sem','Johan'].filter(p=>p!==sequence[i]&&!benches[i].includes(p))}));
}
function intervalMinutes(){return state.switchMinutes===10?10:5;}
function tenMinuteSchedule(m){
 const pool=PLAYERS, keepers=GROUPS[(m-1)%2];
 const offset=Math.floor((m-1)/2)%4;
 const keeperOrder=Array.from({length:4},(_,i)=>keepers[(i+offset)%4]);
 const benchPairs=[];const counts=Object.fromEntries(pool.map(p=>[p,0]));
 function search(i){
  if(i===4)return pool.every(p=>counts[p]===1);
  const candidates=[];
  for(let a=0;a<pool.length;a++)for(let b=a+1;b<pool.length;b++){
   const pair=[pool[a],pool[b]];
   if(m===1&&i===0&&!(pair.includes('Kyan')&&pair.includes('Sem')))continue;
   if(pair.includes(keeperOrder[i])||pair.some(p=>counts[p]))continue;
   candidates.push(pair);
  }
  candidates.sort((a,b)=>a.join('').localeCompare(b.join('')));
  for(const pair of candidates){pair.forEach(p=>counts[p]++);benchPairs.push(pair);if(search(i+1))return true;benchPairs.pop();pair.forEach(p=>counts[p]--);}
  return false;
 }
 if(!search(0))throw Error('Geen geldig 10-minutenschema');
 return Array.from({length:8},(_,i)=>{const n=Math.floor(i/2),keeper=keeperOrder[n],bench=benchPairs[n];return {keeper,bench,field:['Joe','Jan','Levi','Safouane','Brenn','Kyan','Sem','Johan'].filter(p=>p!==keeper&&!bench.includes(p))};});
}
function mode(){return ['6','8','11'].includes(state.fieldMode)?state.fieldMode:'6';}
function schedule(){if(intervalMinutes()===10)return tenMinuteSchedule(state.match);const key=String(state.match);if(!state.history[key]){state.history[key]=generate(state.match);save();}return state.history[key];}
function displayName(p){return state.names[ALL_PLAYERS.indexOf(p)]||p;}
function expandedSchedule(m){
 const size=Number(mode()), pool=ALL_PLAYERS.slice(0,size+6);
 const keepers=GROUPS[(m-1)%2];
 const offset=Math.floor((m-1)/2)%4;
 const sequence=Array.from({length:8},(_,i)=>keepers[(Math.floor(i/2)+offset)%4]);
 const minutes=Object.fromEntries(pool.map(p=>[p,0]));
 const lastBench=Object.fromEntries(pool.map(p=>[p,-10]));
 const rows=[];
 const steps=intervalMinutes()===10?4:8;
 for(let i=0;i<steps;i++){
   const keeper=sequence[intervalMinutes()===10?i*2:i];
   const eligible=pool.filter(p=>p!==keeper);
   // Rotate the six bench spots; prioritize players who have played more.
   eligible.sort((a,b)=>minutes[b]-minutes[a]||lastBench[a]-lastBench[b]||((pool.indexOf(a)+m*3+i*5)%pool.length)-((pool.indexOf(b)+m*3+i*5)%pool.length));
   const bench=eligible.slice(0,6);
   const field=pool.filter(p=>p!==keeper&&!bench.includes(p));
   for(const p of [...field,keeper])minutes[p]+=intervalMinutes();
   for(const p of bench)lastBench[p]=i;
   rows.push({keeper,bench,field});
 }
 return intervalMinutes()===10?rows.flatMap(r=>[r,r]):rows;
}
function current(){return mode()==='6'?schedule()[state.slot]:expandedSchedule(state.match)[state.slot];}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
function beep(){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=new C();const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(880,ctx.currentTime);o.frequency.setValueAtTime(660,ctx.currentTime+.2);g.gain.setValueAtTime(.15,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.5);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.5);setTimeout(()=>ctx.close(),700);}catch(e){}if(navigator.vibrate)navigator.vibrate([200,100,200]);}
function notify(msg){$('notice').textContent=msg;$('notice').classList.add('show');setTimeout(()=>$('notice').classList.remove('show'),5500);beep();}
function setSlot(i){state.slot=Math.max(0,Math.min(7,i));state.elapsed=state.slot*300;state.running=false;save();render();}
function render(){
 const s=current();const field=[...s.field];
 $('matchNumber').textContent=state.match;
 $('groupName').textContent=GROUPS[(state.match-1)%2].map(displayName).join(' · ');
 $('clock').textContent=formatTime(state.elapsed);
 $('period').textContent=`${Math.floor(state.elapsed/60/intervalMinutes())*intervalMinutes()}–${Math.min(40,(Math.floor(state.elapsed/60/intervalMinutes())+1)*intervalMinutes())} min`;
 $('play').textContent=state.running?'⏸ Pauze':'▶ Start';
 $('progress').style.width=`${state.elapsed/2400*100}%`;
 $('keeperName').textContent=displayName(s.keeper);
 $('bench').textContent=s.bench.length?s.bench.map(displayName).join(' · '):'Geen wissels';
 const spots=mode()==='6'?[['attack1',field[3]],['attack2',field[4]],['def1',field[0]],['def2',field[1]],['def3',field[2]],['goalie',s.keeper]]:[['attack1',field[5]],['attack2',field[6]],['def1',field[0]],['def2',field[1]],['def3',field[2]],['extra1',field[3]],['extra2',field[4]],['goalie',s.keeper],...(mode()==='11'?[['extra3',field[7]],['extra4',field[8]],['extra5',field[9]]]:[])];
 for(const [id,p] of spots){const target=$(id);const node=target.classList.contains('player')?target:target.closest('.player');node.querySelector('b').textContent=displayName(p);node.dataset.player=p;const pos=state.positions[mode()]?.[p];if(pos){node.style.left=pos.x+'%';node.style.top=pos.y+'%';}else{const defaults={'attack1':[33,29],'attack2':[67,29],'def1':[17,65],'def2':[50,65],'def3':[83,65],'extra1':[34,45],'extra2':[66,45],'goalie':[50,88],'extra3':[18,39],'extra4':[50,39],'extra5':[82,39]};node.style.left=defaults[id][0]+'%';node.style.top=defaults[id][1]+'%';}}
 $('pitch').classList.toggle('eight',mode()==='8');$('pitch').classList.toggle('eleven',mode()==='11');$('fieldMode').value=mode();$('formationLabel').textContent=mode()==='11'?'10 veldspelers · 1 keeper':mode()==='8'?'7 veldspelers · 1 keeper':'3 achter · 2 voor';$('modeHint').textContent=mode()==='11'?'Heel veld: 11 op het veld en 6 wisselspelers (17 spelers totaal). Keeper iedere 10 minuten.':mode()==='8'?'Half veld: 8 op het veld en 6 wisselspelers (14 spelers totaal). Keeper iedere 10 minuten.':'Kwart veld: 6 op het veld en 2 wisselspelers (8 spelers totaal).';
 $('slots').innerHTML=Array.from({length:40/intervalMinutes()},(_,i)=>{const start=i*intervalMinutes(),slot=start/5;return `<button class="slot ${Math.floor(state.slot*5/intervalMinutes())===i?'selected':''}" data-slot="${slot}">${start}–${start+intervalMinutes()}</button>`}).join('');
 $('tableBody').innerHTML=(mode()==='6'?schedule():expandedSchedule(state.match)).filter((_,i)=>i%(intervalMinutes()/5)===0).map((r,i)=>{const start=i*intervalMinutes();return `<tr class="${Math.floor(state.slot*5/intervalMinutes())===i?'active':''}" data-slot="${start/5}"><td>${start}–${start+intervalMinutes()}</td><td>${displayName(r.keeper)}</td><td>${r.bench.map(displayName).join(' · ')}</td></tr>`}).join('');
 $('prevMatch').disabled=state.match===1;
 $('switchMinutes').value=String(intervalMinutes());$('sound').checked=state.sound;const foot=$('minutesHint');if(foot)foot.textContent=mode()==='6'?intervalMinutes()===5?'Iedere speler: 30 minuten op het veld. Twee losse wisselbeurten van 5 minuten.':'Iedere speler: 30 minuten op het veld. Eén wisselbeurt van 10 minuten.':`Met 6 wisselspelers wordt de speeltijd zo eerlijk mogelijk verdeeld. Wissels om de ${intervalMinutes()} minuten.`;
}
$('slots').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b)setSlot(Number(b.dataset.slot));});
$('tableBody').addEventListener('click',e=>{const r=e.target.closest('[data-slot]');if(r)setSlot(Number(r.dataset.slot));});
$('play').addEventListener('click',()=>{if(state.elapsed>=2400){state.elapsed=0;state.slot=0;}state.running=!state.running;lastTick=Date.now();save();render();});
$('reset').addEventListener('click',()=>{if(confirm('Wedstrijdklok opnieuw beginnen?')){state.elapsed=0;state.slot=0;state.running=false;save();render();}});
$('nextMatch').addEventListener('click',()=>{state.match++;state.slot=0;state.elapsed=0;state.running=false;try{schedule();}catch(e){alert(e.message);}save();render();});
$('prevMatch').addEventListener('click',()=>{if(state.match>1){state.match--;state.slot=0;state.elapsed=0;state.running=false;save();render();}});
$('sound').addEventListener('change',e=>{state.sound=e.target.checked;save();});
$('switchMinutes').addEventListener('change',e=>{state.switchMinutes=Number(e.target.value)===10?10:5;state.slot=0;state.elapsed=0;state.running=false;save();render();});
$('fieldMode').addEventListener('change',e=>{state.fieldMode=e.target.value;state.running=false;save();render();});
$('copy').addEventListener('click',async()=>{const text=`Wedstrijd ${state.match} (${mode()} tegen ${mode()})\n`+(mode()==='6'?schedule():expandedSchedule(state.match)).filter((_,i)=>i%(intervalMinutes()/5)===0).map((s,i)=>`${i*intervalMinutes()}-${(i+1)*intervalMinutes()} | Keeper: ${displayName(s.keeper)} | Veld: ${s.field.map(displayName).join(', ')} | Bank: ${s.bench.map(displayName).join(', ')}`).join('\n');try{await navigator.clipboard.writeText(text);notify('Schema gekopieerd');}catch(e){prompt('Kopieer het schema:',text);}});
$('editNames').addEventListener('click',()=>{$('namesPanel').hidden=!$('namesPanel').hidden;if(!$('namesPanel').hidden){$('nameFields').innerHTML='';state.names.slice(0,Number(mode())+(mode()==='6'?2:6)).forEach((name,i)=>{const l=document.createElement('label');l.textContent=`Speler ${i+1}`;const inp=document.createElement('input');inp.value=name;inp.maxLength=24;inp.dataset.index=i;l.appendChild(inp);$('nameFields').appendChild(l);});}});
// Drag player badges by touch or mouse; positions are saved per playing format and player.
const pitch=$('pitch');let dragging=null;
pitch.addEventListener('pointerdown',e=>{const node=e.target.closest('.player');if(!node)return;dragging={node,pointer:e.pointerId};node.setPointerCapture(e.pointerId);node.classList.add('dragging');e.preventDefault();});
pitch.addEventListener('pointermove',e=>{if(!dragging||dragging.pointer!==e.pointerId)return;const rect=pitch.getBoundingClientRect();const x=Math.max(12,Math.min(88,(e.clientX-rect.left)/rect.width*100));const y=Math.max(9,Math.min(91,(e.clientY-rect.top)/rect.height*100));dragging.node.style.left=x+'%';dragging.node.style.top=y+'%';});
function finishDrag(){if(!dragging)return;const node=dragging.node;state.positions[mode()]??={};state.positions[mode()][node.dataset.player]={x:parseFloat(node.style.left),y:parseFloat(node.style.top)};node.classList.remove('dragging');dragging=null;save();}
pitch.addEventListener('pointerup',finishDrag);pitch.addEventListener('pointercancel',finishDrag);
$('saveNames').addEventListener('click',()=>{[...$('nameFields').querySelectorAll('input')].forEach((x,i)=>{state.names[i]=x.value.trim()||ALL_PLAYERS[i];});$('namesPanel').hidden=true;save();render();});
let lastTick=Date.now();setInterval(()=>{const now=Date.now();if(state.running){const delta=Math.max(0,Math.floor((now-lastTick)/1000));if(delta>0){const old=state.elapsed;state.elapsed=Math.min(2400,old+delta);const newSlot=Math.min(7,Math.floor(state.elapsed/300));if(newSlot!==state.slot){const prev=state.slot;state.slot=newSlot;if(newSlot%(intervalMinutes()/5)===0){notify(newSlot%2===0?'Wissel spelers én keeper!':'Tijd om te wisselen!');}}if(state.elapsed===2400){state.running=false;notify('Einde wedstrijd!');}save();render();}}lastTick=now;},400);
window.addEventListener('pagehide',()=>{state.running=false;save();});
try{schedule();}catch(e){alert(e.message);}render();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
