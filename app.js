const PLAYERS=['Johan','Joe','Jan','Safouane','Levi','Brenn','Kyan','Sem'];
const GROUPS=[['Johan','Joe','Jan','Safouane'],['Kyan','Sem','Levi','Brenn']];
const KEY='voetbalwissel-v1';
let state={match:1,slot:0,elapsed:0,running:false,names:[...PLAYERS],history:{},interval:5,sound:true,positions:{}};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){state={...state,...saved,running:false};}}catch(e){}
if(state.interval!==10)state.interval=5;
const $=id=>document.getElementById(id);
const duration=()=>state.interval*60;
const slotsCount=()=>40/state.interval;
const slotLabel=i=>`${i*state.interval}–${(i+1)*state.interval}`;
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
function generateTen(match){
 const keepers=GROUPS[(match-1)%2];
 const offset=Math.floor((match-1)/2)%4;
 const sequence=Array.from({length:4},(_,i)=>keepers[(i+offset)%4]);
 const random=rng(443921+match*1723);
 const players=shuffle(PLAYERS,random);
 const benches=[];
 function dfs(i,remaining){
  if(i===4)return true;
  for(let a=0;a<remaining.length;a++)for(let b=a+1;b<remaining.length;b++){
   const pair=[remaining[a],remaining[b]];
   if(pair.includes(sequence[i]))continue;
   benches[i]=pair;
   if(dfs(i+1,remaining.filter(p=>!pair.includes(p))))return true;
  }
  return false;
 }
 if(!dfs(0,players))throw Error('Geen geldig wisselschema gevonden');
 return sequence.map((keeper,i)=>({keeper,bench:benches[i],field:PLAYERS.filter(p=>p!==keeper&&!benches[i].includes(p))}));
}
function schedule(){const key=`${state.match}-${state.interval}`;if(!state.history[key]){
 // Preserve previously saved 5-minute schedules from the original app.
 state.history[key]=state.interval===5?(state.history[String(state.match)]||generate(state.match)):generateTen(state.match);save();
 }return state.history[key];}
function displayName(p){return state.names[PLAYERS.indexOf(p)]||p;}
function current(){return schedule()[state.slot];}
const positionIds=['def1','def2','def3','attack1','attack2'];
function positionKey(){return `${state.match}-${state.interval}-${state.slot}`;}
function positionPlayers(){const available=current().field;const stored=state.positions?.[positionKey()];return Array.isArray(stored)&&stored.length===5&&stored.every(p=>available.includes(p))&&new Set(stored).size===5?stored:[...available];}
function setPosition(id,player){const index=positionIds.indexOf(id);if(index<0)return;const ordered=positionPlayers();const other=ordered.indexOf(player);if(other<0)return;[ordered[index],ordered[other]]=[ordered[other],ordered[index]];(state.positions ||= {})[positionKey()]=ordered;save();render();}

function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
function beep(){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=new C();const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(880,ctx.currentTime);o.frequency.setValueAtTime(660,ctx.currentTime+.2);g.gain.setValueAtTime(.15,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.5);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.5);setTimeout(()=>ctx.close(),700);}catch(e){}if(navigator.vibrate)navigator.vibrate([200,100,200]);}
function notify(msg){$('notice').textContent=msg;$('notice').classList.add('show');setTimeout(()=>$('notice').classList.remove('show'),5500);beep();}
function setSlot(i){state.slot=Math.max(0,Math.min(slotsCount()-1,i));state.elapsed=state.slot*duration();state.running=false;save();render();}
function render(){
 const s=current();const field=positionPlayers();
 $('matchNumber').textContent=state.match;
 $('groupName').textContent=state.match%2?'Johan · Joe · Jan · Safouane':'Kyan · Sem · Levi · Brenn';
 $('clock').textContent=formatTime(state.elapsed);
 $('period').textContent=`${slotLabel(state.slot)} min`;
 $('play').textContent=state.running?'⏸ Pauze':'▶ Start';
 $('progress').style.width=`${state.elapsed/2400*100}%`;
 $('keeperName').textContent=displayName(s.keeper);
 $('bench').textContent=s.bench.map(displayName).join(' en ');
 const spots=[['attack1',field[3]],['attack2',field[4]],['def1',field[0]],['def2',field[1]],['def3',field[2]],['goalie',s.keeper]];
 for(const [id,p] of spots)$(id).textContent=displayName(p);
 $('slots').innerHTML=Array.from({length:slotsCount()},(_,i)=>`<button class="slot ${i===state.slot?'selected':''}" data-slot="${i}">${slotLabel(i)}</button>`).join('');
 $('tableBody').innerHTML=schedule().map((r,i)=>`<tr class="${i===state.slot?'active':''}" data-slot="${i}"><td>${slotLabel(i)}</td><td>${displayName(r.keeper)}</td><td>${r.bench.map(displayName).join(' · ')}</td></tr>`).join('');
 $('prevMatch').disabled=state.match===1;
 $('sound').checked=state.sound;
 $('interval').value=String(state.interval);
 $('fairnessHint').textContent=state.interval===5?'Iedere speler: 30 minuten op het veld. Twee losse wisselbeurten van 5 minuten.':'Iedere speler: 30 minuten op het veld. Eén wisselbeurt van 10 minuten.';
}
$('slots').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b)setSlot(Number(b.dataset.slot));});
$('tableBody').addEventListener('click',e=>{const r=e.target.closest('[data-slot]');if(r)setSlot(Number(r.dataset.slot));});
$('play').addEventListener('click',()=>{if(state.elapsed>=2400){state.elapsed=0;state.slot=0;}state.running=!state.running;lastTick=Date.now();carryMs=0;save();render();});
$('reset').addEventListener('click',()=>{if(confirm('Wedstrijdklok opnieuw beginnen?')){state.elapsed=0;state.slot=0;state.running=false;save();render();}});
$('nextMatch').addEventListener('click',()=>{state.match++;state.slot=0;state.elapsed=0;state.running=false;try{schedule();}catch(e){alert(e.message);}save();render();});
$('prevMatch').addEventListener('click',()=>{if(state.match>1){state.match--;state.slot=0;state.elapsed=0;state.running=false;save();render();}});
$('interval').addEventListener('change',e=>{state.interval=Number(e.target.value)===10?10:5;state.slot=0;state.elapsed=0;state.running=false;try{schedule();}catch(err){alert(err.message);}save();render();});
$('testSound').addEventListener('click',()=>{try{beep();$('notice').textContent='Testsignaal afgespeeld';$('notice').classList.add('show');setTimeout(()=>$('notice').classList.remove('show'),2000);}catch(e){}});
$('sound').addEventListener('change',e=>{state.sound=e.target.checked;save();});
$('pitch').addEventListener('click',e=>{const spot=e.target.closest('.player[data-position]');if(!spot)return;const id=spot.dataset.position;const choices=positionPlayers();const select=$('positionSelect');select.innerHTML='';for(const p of choices){const opt=document.createElement('option');opt.value=p;opt.textContent=displayName(p);select.appendChild(opt);}select.value=positionPlayers()[positionIds.indexOf(id)];$('positionLabel').textContent=spot.dataset.label;$('positionDialog').hidden=false;$('positionDialog').dataset.position=id;});
$('positionCancel').addEventListener('click',()=>{$('positionDialog').hidden=true;});
$('positionSave').addEventListener('click',()=>{setPosition($('positionDialog').dataset.position,$('positionSelect').value);$('positionDialog').hidden=true;});
$('copy').addEventListener('click',async()=>{const text=`Wedstrijd ${state.match}\n`+schedule().map((s,i)=>`${i*state.interval}-${(i+1)*state.interval} | Keeper: ${displayName(s.keeper)} | Achter: ${(state.positions?.[`${state.match}-${state.interval}-${i}`]||s.field).slice(0,3).map(displayName).join(', ')} | Voor: ${(state.positions?.[`${state.match}-${state.interval}-${i}`]||s.field).slice(3).map(displayName).join(', ')} | Bank: ${s.bench.map(displayName).join(', ')}`).join('\n');try{await navigator.clipboard.writeText(text);notify('Schema gekopieerd');}catch(e){prompt('Kopieer het schema:',text);}});
$('editNames').addEventListener('click',()=>{$('namesPanel').hidden=!$('namesPanel').hidden;if(!$('namesPanel').hidden){$('nameFields').innerHTML='';state.names.forEach((name,i)=>{const l=document.createElement('label');l.textContent=`Speler ${i+1}`;const inp=document.createElement('input');inp.value=name;inp.maxLength=24;inp.dataset.index=i;l.appendChild(inp);$('nameFields').appendChild(l);});}});
$('saveNames').addEventListener('click',()=>{state.names=[...$('nameFields').querySelectorAll('input')].map((x,i)=>x.value.trim()||PLAYERS[i]);$('namesPanel').hidden=true;save();render();});
let lastTick=Date.now(),carryMs=0;
setInterval(()=>{const now=Date.now();if(state.running){carryMs+=Math.max(0,now-lastTick);const delta=Math.floor(carryMs/1000);if(delta>0){carryMs-=delta*1000;const old=state.elapsed;state.elapsed=Math.min(2400,old+delta);const oldSlot=Math.floor(old/duration()),newSlot=Math.min(slotsCount()-1,Math.floor(state.elapsed/duration()));if(newSlot!==state.slot){state.slot=newSlot;notify(state.elapsed>=2400?'Einde wedstrijd!':(state.interval===10||newSlot*state.interval%10===0?'Wissel spelers én keeper!':'Tijd om te wisselen!'));}if(state.elapsed===2400){state.running=false;if(oldSlot===newSlot)notify('Einde wedstrijd!');}save();render();}}else carryMs=0;lastTick=now;},250);
window.addEventListener('pagehide',()=>{state.running=false;save();});
try{schedule();}catch(e){alert(e.message);}render();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
