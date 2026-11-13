const PLAYERS=['Johan','Joe','Jan','Safouane','Levi','Brenn','Kyan','Sem'];
const GROUPS=[['Johan','Joe','Jan','Safouane'],['Kyan','Sem','Levi','Brenn']];
const KEY='voetbalwissel-v1';
let state={match:1,slot:0,elapsed:0,running:false,names:[...PLAYERS],history:{},sound:true};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){state={...state,...saved,running:false};}}catch(e){}
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
function schedule(){const key=String(state.match);if(!state.history[key]){state.history[key]=generate(state.match);save();}return state.history[key];}
function displayName(p){return state.names[PLAYERS.indexOf(p)]||p;}
function current(){return schedule()[state.slot];}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
function beep(){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=new C();const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(880,ctx.currentTime);o.frequency.setValueAtTime(660,ctx.currentTime+.2);g.gain.setValueAtTime(.15,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.5);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.5);setTimeout(()=>ctx.close(),700);}catch(e){}if(navigator.vibrate)navigator.vibrate([200,100,200]);}
function notify(msg){$('notice').textContent=msg;$('notice').classList.add('show');setTimeout(()=>$('notice').classList.remove('show'),5500);beep();}
function setSlot(i){state.slot=Math.max(0,Math.min(7,i));state.elapsed=state.slot*300;state.running=false;save();render();}
function render(){
 const s=current();const field=[...s.field];
 $('matchNumber').textContent=state.match;
 $('groupName').textContent=state.match%2?'Johan · Joe · Jan · Safouane':'Kyan · Sem · Levi · Brenn';
 $('clock').textContent=formatTime(state.elapsed);
 $('period').textContent=`${state.slot*5}–${state.slot*5+5} min`;
 $('play').textContent=state.running?'⏸ Pauze':'▶ Start';
 $('progress').style.width=`${state.elapsed/2400*100}%`;
 $('keeperName').textContent=displayName(s.keeper);
 $('bench').textContent=s.bench.map(displayName).join(' en ');
 const spots=[['attack1',field[3]],['attack2',field[4]],['def1',field[0]],['def2',field[1]],['def3',field[2]],['goalie',s.keeper]];
 for(const [id,p] of spots)$(id).textContent=displayName(p);
 $('slots').innerHTML=Array.from({length:8},(_,i)=>`<button class="slot ${i===state.slot?'selected':''}" data-slot="${i}">${i*5}–${i*5+5}</button>`).join('');
 $('tableBody').innerHTML=schedule().map((r,i)=>`<tr class="${i===state.slot?'active':''}" data-slot="${i}"><td>${i*5}–${i*5+5}</td><td>${displayName(r.keeper)}</td><td>${r.bench.map(displayName).join(' · ')}</td></tr>`).join('');
 $('prevMatch').disabled=state.match===1;
 $('sound').checked=state.sound;
}
$('slots').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b)setSlot(Number(b.dataset.slot));});
$('tableBody').addEventListener('click',e=>{const r=e.target.closest('[data-slot]');if(r)setSlot(Number(r.dataset.slot));});
$('play').addEventListener('click',()=>{if(state.elapsed>=2400){state.elapsed=0;state.slot=0;}state.running=!state.running;lastTick=Date.now();save();render();});
$('reset').addEventListener('click',()=>{if(confirm('Wedstrijdklok opnieuw beginnen?')){state.elapsed=0;state.slot=0;state.running=false;save();render();}});
$('nextMatch').addEventListener('click',()=>{state.match++;state.slot=0;state.elapsed=0;state.running=false;try{schedule();}catch(e){alert(e.message);}save();render();});
$('prevMatch').addEventListener('click',()=>{if(state.match>1){state.match--;state.slot=0;state.elapsed=0;state.running=false;save();render();}});
$('sound').addEventListener('change',e=>{state.sound=e.target.checked;save();});
$('copy').addEventListener('click',async()=>{const text=`Wedstrijd ${state.match}\n`+schedule().map((s,i)=>`${i*5}-${i*5+5} | Keeper: ${displayName(s.keeper)} | Achter: ${s.field.slice(0,3).map(displayName).join(', ')} | Voor: ${s.field.slice(3).map(displayName).join(', ')} | Bank: ${s.bench.map(displayName).join(', ')}`).join('\n');try{await navigator.clipboard.writeText(text);notify('Schema gekopieerd');}catch(e){prompt('Kopieer het schema:',text);}});
$('editNames').addEventListener('click',()=>{$('namesPanel').hidden=!$('namesPanel').hidden;if(!$('namesPanel').hidden){$('nameFields').innerHTML='';state.names.forEach((name,i)=>{const l=document.createElement('label');l.textContent=`Speler ${i+1}`;const inp=document.createElement('input');inp.value=name;inp.maxLength=24;inp.dataset.index=i;l.appendChild(inp);$('nameFields').appendChild(l);});}});
$('saveNames').addEventListener('click',()=>{state.names=[...$('nameFields').querySelectorAll('input')].map((x,i)=>x.value.trim()||PLAYERS[i]);$('namesPanel').hidden=true;save();render();});
let lastTick=Date.now();setInterval(()=>{const now=Date.now();if(state.running){const delta=Math.max(0,Math.floor((now-lastTick)/1000));if(delta>0){const old=state.elapsed;state.elapsed=Math.min(2400,old+delta);const newSlot=Math.min(7,Math.floor(state.elapsed/300));if(newSlot!==state.slot){state.slot=newSlot;notify(state.elapsed%600===0?'Wissel spelers én keeper!':'Tijd om te wisselen!');}if(state.elapsed===2400){state.running=false;notify('Einde wedstrijd!');}save();render();}}lastTick=now;},400);
window.addEventListener('pagehide',()=>{state.running=false;save();});
try{schedule();}catch(e){alert(e.message);}render();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
