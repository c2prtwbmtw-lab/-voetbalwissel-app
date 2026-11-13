const PLAYERS=['Johan','Joe','Jan','Safouane','Levi','Brenn','Kyan','Sem'];
const GROUPS=[['Johan','Joe','Jan','Safouane'],['Kyan','Sem','Levi','Brenn']];
const KEY='voetbalwissel-v1';
let state={match:1,slot:0,elapsed:0,running:false,names:[...PLAYERS],history:{},sound:true,benchChoices:{},startedAt:null,interval:5};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){state={...state,...saved,running:false};}}catch(e){}
const $=id=>document.getElementById(id);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}};
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
const shuffle=(a,random)=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function generate(match){
 if(state.interval===10)return generateTen(match);
 const keepers=GROUPS[(match-1)%2];
 const offset=Math.floor((match-1)/2)%4;
 const sequence=Array.from({length:8},(_,i)=>keepers[(Math.floor(i/2)+offset)%4]);
 // Every player sits exactly twice, never in consecutive 5-minute slots.
 // Keeper cannot be on the bench during their 10-minute stint.
 const fixed=state.benchChoices[`${match}-${state.interval}`]|| (match===1?['Kyan','Sem']:null);
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
 const fixed=state.benchChoices[`${match}-${state.interval}`]||(match===1?['Kyan','Sem']:null);
 const used=new Set(),benches=[];
 function dfs(i){
  if(i===4)return used.size===8;
  const pairs=[];
  for(let a=0;a<PLAYERS.length;a++)for(let b=a+1;b<PLAYERS.length;b++){
   const pair=[PLAYERS[a],PLAYERS[b]];
   if(pair.some(p=>used.has(p)||p===sequence[i]))continue;
   if(i===0&&fixed&&!fixed.every(p=>pair.includes(p)))continue;
   pairs.push(pair);
  }
  for(const pair of shuffle(pairs,rng(918273+match*991+i))){
   pair.forEach(p=>used.add(p));benches.push(pair);
   if(dfs(i+1))return true;
   benches.pop();pair.forEach(p=>used.delete(p));
  }
  return false;
 }
 if(!dfs(0))throw Error('Geen geldig schema voor deze beginwisselbank. Kies twee andere spelers.');
 return Array.from({length:8},(_,i)=>{
  const k=Math.floor(i/2),keeper=sequence[k],bench=benches[k];
  return {keeper,bench,field:PLAYERS.filter(p=>p!==keeper&&!bench.includes(p))};
 });
}
function validSchedule(rows){
 return Array.isArray(rows)&&rows.length===8&&rows.every(r=>r&&typeof r.keeper==='string'&&PLAYERS.includes(r.keeper)&&Array.isArray(r.bench)&&r.bench.length===2&&r.bench.every(p=>PLAYERS.includes(p))&&Array.isArray(r.field)&&r.field.length===5);
}
function schedule(){
 const key=`${state.match}-${state.interval}`;
 if(!validSchedule(state.history[key])){state.history[key]=generate(state.match);save();}
 return state.history[key];
}
function displayName(p){return state.names[PLAYERS.indexOf(p)]||p;}
function current(){return schedule()[state.slot];}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
function beep(){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=audioContext||(audioContext=new C());if(ctx.state==='suspended')ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(880,ctx.currentTime);o.frequency.setValueAtTime(660,ctx.currentTime+.2);g.gain.setValueAtTime(.15,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.5);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.5);}catch(e){}if(navigator.vibrate)navigator.vibrate([200,100,200]);}
function notify(msg){$('notice').textContent=msg;$('notice').classList.add('show');setTimeout(()=>$('notice').classList.remove('show'),5500);beep();}
function setSlot(i){state.slot=Math.max(0,Math.min(7,i));state.elapsed=state.slot*300;state.running=false;state.startedAt=null;save();render();}
function render(){
 state.slot=Math.max(0,Math.min(7,Math.floor(state.elapsed/300)));
 const s=current();const field=[...s.field];
 $('matchNumber').textContent=state.match;
 $('groupName').textContent=state.match%2?'Johan · Joe · Jan · Safouane':'Kyan · Sem · Levi · Brenn';
 $('clock').textContent=formatTime(state.elapsed);
 $('period').textContent=state.elapsed>=2400?'Einde':`${Math.floor(state.elapsed/(state.interval*60))*state.interval}–${Math.min(40,(Math.floor(state.elapsed/(state.interval*60))+1)*state.interval)} min`;
 $('play').textContent=state.running?'⏸ Pauze':'▶ Start';
 $('progress').style.width=`${state.elapsed/2400*100}%`;
 $('keeperName').textContent=displayName(s.keeper);
 $('bench').textContent=s.bench.map(displayName).join(' en ');
 const spots=[['attack1',field[3]],['attack2',field[4]],['def1',field[0]],['def2',field[1]],['def3',field[2]],['goalie',s.keeper]];
 for(const [id,p] of spots)$(id).textContent=displayName(p);
 $('slots').innerHTML=Array.from({length:40/state.interval},(_,i)=>`<button class="slot ${Math.floor(state.slot*5/state.interval)===i?'selected':''}" data-slot="${i*state.interval/5}">${i*state.interval}–${(i+1)*state.interval}</button>`).join('');
 $('tableBody').innerHTML=Array.from({length:40/state.interval},(_,i)=>{const idx=i*state.interval/5,r=schedule()[idx];return `<tr class="${Math.floor(state.slot*5/state.interval)===i?'active':''}" data-slot="${idx}"><td>${i*state.interval}–${(i+1)*state.interval}</td><td>${displayName(r.keeper)}</td><td>${r.bench.map(displayName).join(' · ')}</td></tr>`;}).join('');
 $('prevMatch').disabled=state.match===1;
 $('sound').checked=state.sound;
 $('interval5').classList.toggle('selected',state.interval===5);
 $('interval10').classList.toggle('selected',state.interval===10);
 const chosen=state.benchChoices[`${state.match}-${state.interval}`]|| (state.match===1?['Kyan','Sem']:[]);
 $('benchChoices').innerHTML=PLAYERS.map(p=>`<label class="bench-option"><input type="checkbox" value="${p}" ${chosen.includes(p)?'checked':''}> ${displayName(p)}</label>`).join('');
}
for(const n of [5,10])$('interval'+n).addEventListener('click',()=>{if(state.interval===n)return;state.interval=n;state.running=false;state.startedAt=null;state.elapsed=0;state.slot=0;try{schedule();save();render();}catch(e){state.interval=n===5?10:5;alert(e.message);render();}});
$('slots').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b)setSlot(Number(b.dataset.slot));});
$('tableBody').addEventListener('click',e=>{const r=e.target.closest('[data-slot]');if(r)setSlot(Number(r.dataset.slot));});
$('play').addEventListener('click',()=>{if(state.elapsed>=2400){state.elapsed=0;state.slot=0;}state.running=!state.running;state.startedAt=state.running?Date.now()-state.elapsed*1000:null;save();render();});
$('reset').addEventListener('click',()=>{if(confirm('Wedstrijdklok opnieuw beginnen?')){state.elapsed=0;state.slot=0;state.running=false;state.startedAt=null;save();render();}});
$('nextMatch').addEventListener('click',()=>{state.match++;state.slot=0;state.elapsed=0;state.running=false;state.startedAt=null;try{schedule();}catch(e){alert(e.message);}save();render();});
$('prevMatch').addEventListener('click',()=>{if(state.match>1){state.match--;state.slot=0;state.elapsed=0;state.running=false;state.startedAt=null;save();render();}});
$('sound').addEventListener('change',e=>{state.sound=e.target.checked;save();});
$('copy').addEventListener('click',async()=>{const text=`Wedstrijd ${state.match} (${state.interval} minuten wisselen)\n`+Array.from({length:40/state.interval},(_,i)=>{const s=schedule()[i*state.interval/5];return `${i*state.interval}-${(i+1)*state.interval} | Keeper: ${displayName(s.keeper)} | Achter: ${s.field.slice(0,3).map(displayName).join(', ')} | Voor: ${s.field.slice(3).map(displayName).join(', ')} | Bank: ${s.bench.map(displayName).join(', ')}`;}).join('\n');try{await navigator.clipboard.writeText(text);notify('Schema gekopieerd');}catch(e){prompt('Kopieer het schema:',text);}});
$('editNames').addEventListener('click',()=>{$('namesPanel').hidden=!$('namesPanel').hidden;if(!$('namesPanel').hidden){$('nameFields').innerHTML='';state.names.forEach((name,i)=>{const l=document.createElement('label');l.textContent=`Speler ${i+1}`;const inp=document.createElement('input');inp.value=name;inp.maxLength=24;inp.dataset.index=i;l.appendChild(inp);$('nameFields').appendChild(l);});}});
$('saveNames').addEventListener('click',()=>{state.names=[...$('nameFields').querySelectorAll('input')].map((x,i)=>x.value.trim()||PLAYERS[i]);$('namesPanel').hidden=true;save();render();});
$('applyBench').addEventListener('click',()=>{
 const selected=[...$('benchChoices').querySelectorAll('input:checked')].map(x=>x.value);
 if(selected.length!==2){alert('Kies precies twee spelers voor de beginwisselbank.');return;}
 const key=`${state.match}-${state.interval}`,old=state.history[key],previous=state.benchChoices[key];
 state.benchChoices[key]=selected;delete state.history[key];
 try{schedule();state.running=false;state.startedAt=null;state.elapsed=0;state.slot=0;save();render();notify('Nieuw schema met gekozen beginwisselbank');}
 catch(e){if(old)state.history[key]=old;if(previous)state.benchChoices[key]=previous;else delete state.benchChoices[key];alert('Deze combinatie levert geen geldig eerlijk schema op. Kies twee andere spelers.');render();}
});
let audioContext=null;
function unlockAudio(){try{const C=window.AudioContext||window.webkitAudioContext;if(!audioContext)audioContext=new C();if(audioContext.state==='suspended')audioContext.resume();}catch(e){}}
$('play').addEventListener('click',unlockAudio);
function syncClock(){
 if(!state.running)return;
 const now=Date.now(),old=state.elapsed;
 if(!state.startedAt)state.startedAt=now-old*1000;
 state.elapsed=Math.max(old,Math.min(2400,Math.floor((now-state.startedAt)/1000)));
 const newSlot=Math.min(7,Math.floor(state.elapsed/300));
 if(newSlot!==state.slot){const oldSlot=state.slot;state.slot=newSlot;if(state.interval===5||newSlot%2===0)notify(state.elapsed>=2400?'Einde wedstrijd!':newSlot%2===0?'Wissel spelers én keeper!':'Tijd om te wisselen!');}
 if(state.elapsed>=2400){state.running=false;state.startedAt=null;if(old<2400)notify('Einde wedstrijd!');}
 if(state.elapsed!==old){save();render();}
}
setInterval(syncClock,250);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncClock();});
window.addEventListener('pageshow',syncClock);
try{schedule();}catch(e){alert(e.message);}render();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
