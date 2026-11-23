const DEFAULT=['Johan','Joe','Jan','Safouane','Levi','Brenn','Kyan','Sem'];
const KEY='voetbalwissel-v5';
const DURATIONS={'40':{total:40,periods:4,minutes:10,label:'O8 / O9 / O10'},'60q':{total:60,periods:4,minutes:15,label:'O11 / O12'},'60h':{total:60,periods:2,minutes:30,label:'O13'},'70':{total:70,periods:2,minutes:35,label:'O14 / O15'},'80':{total:80,periods:2,minutes:40,label:'O16 / O17'},'90':{total:90,periods:2,minutes:45,label:'O18 / O19 / Senioren'}};
const durationInfo=()=>DURATIONS[String(state.duration)]||DURATIONS['40'];
const totalMinutes=()=>durationInfo().total;
const nextBreak=(elapsed)=>{const d=durationInfo(),segment=d.minutes*60;return Math.floor(elapsed/segment+1)*segment;};
const $=id=>document.getElementById(id);
let state={match:1,elapsed:0,running:false,format:6,interval:5,duration:40,names:[...DEFAULT],sound:true,manualBench:[],startingKeeper:null,fieldOrder:[],history:{},halftime:false,scores:{},defenders:null,keeperMode:'rotate',fixedKeeper:null};
try{const old=JSON.parse(localStorage.getItem(KEY)||'null');if(old)state={...state,...old};else{const prev=JSON.parse(localStorage.getItem('voetbalwissel-v4')||localStorage.getItem('voetbalwissel-v3')||localStorage.getItem('voetbalwissel-v1')||'null');if(prev){state={...state,...prev,running:false,halftime:false};}}}catch(e){}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
if(!state.scores||typeof state.scores!=='object')state.scores={};
if(!Number.isInteger(Number(state.interval))||Number(state.interval)<5||Number(state.interval)>40||Number(state.interval)%5!==0)state.interval=5;else state.interval=Number(state.interval);
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
const scheduleKey=()=>['balanced-v5-roles',state.match,state.format,state.interval,state.duration,state.names.join('|'),state.manualBench.join(','),state.startingKeeper,state.fieldOrder.join(','),defenders().join(','),state.keeperMode,state.fixedKeeper].join(':');
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
 const fixedMode=state.format!==6&&state.keeperMode==='fixed';
 const chosenKeeper=Number.isInteger(state.fixedKeeper)&&state.fixedKeeper>=0&&state.fixedKeeper<n?state.fixedKeeper:(firstKeeper()??0);
 for(let i=0;i<slots();i++){
  const minute=i*state.interval,weight=Math.min(state.interval,totalMinutes()-minute);
  const keeper=fixedMode?chosenKeeper:keeperOrder[(keeperOffset+Math.floor(minute/10))%n];
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
   if(i===0&&state.match===1&&validBench()&&!state.manualBench.includes(keeper)){
    bench=[...state.manualBench];
   }
  }
  const field=Array.from({length:n},(_,j)=>j).filter(j=>j!==keeper&&!bench.includes(j));
  if(i===0&&state.match===1&&state.fieldOrder?.length)field.sort((a,b)=>{const ai=state.fieldOrder.indexOf(a),bi=state.fieldOrder.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi);});
  // Preserve the formation from the preceding interval: players remaining
  // on the pitch stay in their positions; incoming players fill empty spots.
  if(i>0){
   const prev=arr[i-1].field,ordered=Array(field.length).fill(null);
   const incoming=field.filter(j=>!prev.includes(j));
   prev.forEach((j,pos)=>{if(pos<ordered.length&&field.includes(j))ordered[pos]=j;});
   for(let pos=0;pos<ordered.length;pos++)if(ordered[pos]===null)ordered[pos]=incoming.shift();
   field.splice(0,field.length,...ordered);
  }
  arr.push({keeper,bench,field});
  for(let j=0;j<n;j++){if(!bench.includes(j))played[j]+=weight;else lastBench[j]=i;}
 }
 return arr;
}
function schedule(){const k=scheduleKey();if(!state.history[k]){state.history={};state.history[k]=build();}return state.history[k];}
// Unlock iOS Web Audio from an explicit user gesture before the clock starts.
// iOS requires audio to be resumed by a user gesture. Keep one context alive.
let alarmAudio=null;
async function unlockAlarm(){
 if(!state.sound)return false;
 try{
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return false;
  if(!alarmAudio||alarmAudio.state==='closed')alarmAudio=new C();
  if(alarmAudio.state!=='running')await alarmAudio.resume();
  return alarmAudio.state==='running';
 }catch(e){return false;}
}
function playAlarmTones(final=false){
 if(!state.sound||!alarmAudio||alarmAudio.state!=='running')return false;
 try{
  const start=alarmAudio.currentTime+0.06;
  const notes=final?[660,660,880,1046]:[880,880,880];
  notes.forEach((hz,i)=>{
   const at=start+i*0.48;
   const osc=alarmAudio.createOscillator(),gain=alarmAudio.createGain();
   osc.type='square';osc.frequency.setValueAtTime(hz,at);
   gain.gain.setValueAtTime(0.0001,at);
   gain.gain.exponentialRampToValueAtTime(0.28,at+0.025);
   gain.gain.setValueAtTime(0.28,at+0.30);
   gain.gain.exponentialRampToValueAtTime(0.0001,at+0.39);
   osc.connect(gain);gain.connect(alarmAudio.destination);
   osc.start(at);osc.stop(at+0.40);
  });
  return true;
 }catch(e){return false;}
}
function alarmSignal(final=false){
 if(!state.sound)return;
 if(!playAlarmTones(final)){
  // When the page has been suspended, resuming may not be permitted without a tap.
  unlockAlarm().then(ok=>{if(ok)playAlarmTones(final);});
 }
 navigator.vibrate?.(final?[300,150,300,150,500]:[250,100,250,100,250]);
}
function notify(msg,{alarm=false,final=false}={}){
 $('notice').textContent=msg;$('notice').classList.add('show');
 setTimeout(()=>$('notice').classList.remove('show'),alarm?7000:4000);
 if(alarm)alarmSignal(final);
}
function defaultPositions(){const f=state.format;if(f===6)return [{x:50,y:87,r:'K'},{x:17,y:65,r:'V'},{x:50,y:65,r:'V'},{x:83,y:65,r:'V'},{x:33,y:29,r:'A'},{x:67,y:29,r:'A'}];if(f===8)return [{x:50,y:89,r:'K'},{x:18,y:70,r:'V'},{x:50,y:72,r:'V'},{x:82,y:70,r:'V'},{x:30,y:48,r:'M'},{x:70,y:48,r:'M'},{x:32,y:24,r:'A'},{x:68,y:24,r:'A'}];return [{x:50,y:91,r:'K'},{x:12,y:73,r:'V'},{x:37,y:77,r:'V'},{x:63,y:77,r:'V'},{x:88,y:73,r:'V'},{x:25,y:51,r:'M'},{x:50,y:55,r:'M'},{x:75,y:51,r:'M'},{x:18,y:25,r:'A'},{x:50,y:20,r:'A'},{x:82,y:25,r:'A'}];}
// Formation coordinates are separate from the match history and survive updates.
const FORMATION_KEY='coaches-formation-v27';
let customFormations={};
try{customFormations=JSON.parse(localStorage.getItem(FORMATION_KEY)||'{}')||{};}catch(e){}
function positions(){
 const base=defaultPositions(),saved=customFormations[String(state.format)];
 return base.map((p,i)=>saved&&saved[i]&&Number.isFinite(saved[i].x)&&Number.isFinite(saved[i].y)?{...p,x:saved[i].x,y:saved[i].y}:p);
}
function setPosition(index,x,y){
 const key=String(state.format),list=positions().map(v=>({x:v.x,y:v.y}));
 list[index]={x:Math.max(9,Math.min(91,x)),y:Math.max(8,Math.min(92,y))};
 customFormations[key]=list;localStorage.setItem(FORMATION_KEY,JSON.stringify(customFormations));
 render();
}
function renderKeeperMode(){
 const wrap=$('keeperModeSettings');wrap.hidden=state.format===6;
 $('keeperMode').value=state.keeperMode==='fixed'?'fixed':'rotate';
 $('fixedKeeperLabel').hidden=state.format===6||state.keeperMode!=='fixed';
 const sel=$('fixedKeeper'),value=String(state.fixedKeeper??firstKeeper()??0);
 sel.innerHTML='';state.names.forEach((nm,i)=>{const o=document.createElement('option');o.value=i;o.textContent=nm;sel.appendChild(o);});
 sel.value=value;
}
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
 $('prevMatch').disabled=state.match===1;$('sound').checked=state.sound;$('format').value=String(state.format);$('interval').value=String(state.interval);
 $('duration').value=String(state.duration);renderBenchPicker();renderDefenderPicker();renderKeeperMode();
 $('playerCount').textContent=`${count()} spelers (minimaal ${state.format}, maximaal ${state.format+6})`;
 $('summary').textContent=`${durationInfo().label}: ${durationInfo().periods} × ${durationInfo().minutes} minuten (${totalMinutes()} minuten), met rust tussen de periodes. Precies ${state.format} spelers op het veld, inclusief keeper. ${state.format!==6&&state.keeperMode==='fixed'?'Vaste keeper voor de hele wedstrijd':'Keeper om de 10 minuten'}; veldspelers om de ${state.interval} minuten.`;
}
function isBreakPoint(t){const d=durationInfo(),segment=d.minutes*60;return t>0&&t<totalMinutes()*60&&t%segment===0;}
function resetClock(){state.elapsed=0;state.running=false;state.halftime=false;state.runAnchor=null;save();render();}
function adjustFormat(f){state.format=f;state.names=state.names.slice(0,f+6);while(state.names.length<f)state.names.push(`Speler ${state.names.length+1}`);state.manualBench=[];state.startingKeeper=null;state.fieldOrder=[];state.defenders=null;state.history={};resetClock();}
$('format').addEventListener('change',e=>adjustFormat(Number(e.target.value)));
$('keeperMode').addEventListener('change',e=>{state.keeperMode=e.target.value;state.fixedKeeper=Number($('fixedKeeper').value);state.history={};save();render();});
$('fixedKeeper').addEventListener('change',e=>{state.fixedKeeper=Number(e.target.value);state.history={};save();render();});
$('resetFormation').addEventListener('click',()=>{delete customFormations[String(state.format)];localStorage.setItem(FORMATION_KEY,JSON.stringify(customFormations));render();});
$('duration').addEventListener('change',e=>{state.duration=e.target.value;state.history={};resetClock();});
$('interval').addEventListener('change',e=>{const minutes=Number(e.target.value);if(!Number.isInteger(minutes)||minutes<5||minutes>40||minutes%5!==0)return;state.interval=minutes;state.history={};resetClock();});

$('addPlayer').addEventListener('click',()=>{if(count()>=state.format+6)return alert('Maximaal 6 extra wisselspelers.');state.names.push(`Speler ${count()+1}`);state.manualBench=[];state.startingKeeper=null;state.fieldOrder=[];state.history={};save();render();openNames();});
$('removePlayer').addEventListener('click',()=>{if(count()<=state.format)return alert('Er moeten genoeg spelers voor het veld zijn.');state.names.pop();state.defenders=defenders().filter(i=>i<state.names.length);state.manualBench=[];state.startingKeeper=null;state.fieldOrder=[];state.history={};save();render();openNames();});
function openNames(){$('namesPanel').hidden=false;$('nameFields').innerHTML='';state.names.forEach((v,i)=>{const label=document.createElement('label');label.textContent=`Speler ${i+1}`;const inp=document.createElement('input');inp.value=v;inp.maxLength=30;label.appendChild(inp);$('nameFields').appendChild(label);});}
function toggleNames(){if($('namesPanel').hidden){openNames();$('namesPanel').scrollIntoView({behavior:'smooth',block:'center'});}else $('namesPanel').hidden=true;}
$('editNames').addEventListener('click',toggleNames);
$('editNamesNearField').addEventListener('click',()=>{openNames();$('namesPanel').scrollIntoView({behavior:'smooth',block:'center'});});
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
 // Handmatige wissels mogen afwijken van de automatische positieverdeling.
 const r=schedule()[editingSlot],oldField=r.field,oldKeeper=r.keeper;
 r.keeper=keeper;r.bench=bench;
 r.field=[...oldField,oldKeeper,...Array.from({length:count()},(_,j)=>j)].filter((j,i,arr)=>j!==keeper&&!bench.includes(j)&&arr.indexOf(j)===i).slice(0,state.format-1);
 state.history[scheduleKey()]=schedule();
 $('slotEditor').hidden=true;editingSlot=null;save();render();
});
$('play').addEventListener('click',()=>{unlockAlarm();if(state.halftime){state.halftime=false;state.running=true;}else{if(state.elapsed>=totalMinutes()*60)state.elapsed=0;state.running=!state.running;}state.runAnchor=state.running?Date.now()-state.elapsed*1000:null;save();render();});
$('secondHalf').addEventListener('click',()=>{unlockAlarm();state.halftime=false;state.running=true;state.runAnchor=Date.now()-state.elapsed*1000;save();render();});
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
$('sound').addEventListener('change',e=>{state.sound=e.target.checked;save();if(state.sound)unlockAlarm();});
$('testAlarm').addEventListener('click',async()=>{
 if(!state.sound){alert('Zet eerst Wisselsignaal aan onder Instellingen.');return;}
 const ready=await unlockAlarm();
 if(!ready){alert('Geluid kon niet worden gestart. Controleer het volume en probeer opnieuw.');return;}
 const played=playAlarmTones(false);
 $('notice').textContent=played?'🔔 Testalarm wordt afgespeeld':'Audio kon niet worden afgespeeld';
 $('notice').classList.add('show');setTimeout(()=>$('notice').classList.remove('show'),4000);
});
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
 // Zelf gekozen beginwissels zijn altijd toegestaan, ongeacht de spelersrollen.
 state.fieldOrder=[];state.history={};resetClock();
});
// Hold a player name for 3 seconds, then tap another name to exchange players.
// Drag a player to move that formation position without changing the player name.
let selectedPosition=null,dragging=null,holdTimer=null,suppressClick=false;
function showSelection(pos){selectedPosition=pos;document.querySelectorAll('#playersOnField .player').forEach(el=>el.classList.toggle('chosen',Number(el.dataset.pos)===pos));$('formationHint').textContent='Speler geselecteerd (geel). Tik op een andere spelersnaam om te ruilen, of tik opnieuw om te annuleren.';}
function exchange(a,b){
 if(a===b){selectedPosition=null;render();return;}
 const rows=schedule(),slot=currentSlot(),current=rows[slot];
 const ids=[current.keeper,...current.field];
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=ids.length||b>=ids.length)return;
 if(state.format!==6&&state.keeperMode==='fixed'&&(a===0||b===0)){
  notify('Bij een vaste keeper kun je de keeper niet omwisselen.');selectedPosition=null;render();return;
 }
 [ids[a],ids[b]]=[ids[b],ids[a]];
 current.keeper=ids[0];current.field=ids.slice(1);
 for(let i=slot+1;i<rows.length;i++){
  const prev=rows[i-1].field,r=rows[i],ordered=Array(r.field.length).fill(null);
  const incoming=r.field.filter(j=>!prev.includes(j));
  prev.forEach((j,pos)=>{if(pos<ordered.length&&r.field.includes(j))ordered[pos]=j;});
  for(let pos=0;pos<ordered.length;pos++)if(ordered[pos]===null)ordered[pos]=incoming.shift();
  r.field=ordered;
 }
 if(slot===0){state.fieldOrder=[...current.field];state.startingKeeper=current.keeper;}
 state.history={[scheduleKey()]:rows};selectedPosition=null;save();render();
}
function cancelHold(){if(holdTimer!==null){clearTimeout(holdTimer);holdTimer=null;}}
$('playersOnField').addEventListener('pointerdown',e=>{
 const el=e.target.closest('.player');if(!el)return;
 cancelHold();
 dragging={pos:Number(el.dataset.pos),x:e.clientX,y:e.clientY,moved:false,held:false,id:e.pointerId};
 if(e.target.closest('b')){
  holdTimer=setTimeout(()=>{
   if(!dragging||dragging.moved)return;
   dragging.held=true;showSelection(dragging.pos);navigator.vibrate?.(90);
  },3000);
 }
});
$('playersOnField').addEventListener('pointermove',e=>{
 if(!dragging||dragging.id!==e.pointerId)return;
 if(Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)>12){dragging.moved=true;cancelHold();}
});
$('playersOnField').addEventListener('pointerup',e=>{
 if(!dragging||dragging.id!==e.pointerId)return;
 const d=dragging;cancelHold();dragging=null;
 if(d.moved){
  const rect=$('pitch').getBoundingClientRect();
  setPosition(d.pos,(e.clientX-rect.left)/rect.width*100,(e.clientY-rect.top)/rect.height*100);
  suppressClick=true;setTimeout(()=>suppressClick=false,300);return;
 }
 if(d.held){suppressClick=true;setTimeout(()=>suppressClick=false,300);return;}
});
$('playersOnField').addEventListener('pointercancel',()=>{cancelHold();dragging=null;});
$('playersOnField').addEventListener('click',e=>{
 if(suppressClick)return;
 const el=e.target.closest('.player');if(!el||!e.target.closest('b'))return;
 const pos=Number(el.dataset.pos);
 if(selectedPosition===null){showSelection(pos);return;}
 if(pos===selectedPosition){selectedPosition=null;render();return;}
 exchange(selectedPosition,pos);
 $('formationHint').textContent='Sleep spelers om de opstelling te veranderen. Houd een naam 3 seconden ingedrukt en tik daarna op een andere naam om te wisselen.';
});

// Use actual elapsed wall time, not a count of timer callbacks.
// iOS may suspend callbacks when the screen locks; catch up on return.
if(state.running && !Number.isFinite(state.runAnchor))state.runAnchor=Date.now()-state.elapsed*1000;
function tickMatch(){
 if(!state.running)return;
 const now=Date.now();
 const before=state.elapsed, finish=totalMinutes()*60;
 const boundary=nextBreak(before);
 const actual=Math.max(before,Math.floor((now-state.runAnchor)/1000));
 state.elapsed=Math.min(finish,boundary,actual);
 if(isBreakPoint(state.elapsed)){
  state.running=false;state.halftime=true;state.runAnchor=null;
  const period=Math.round(state.elapsed/(durationInfo().minutes*60));
  notify(`🔔 RUST – Periode ${period} afgelopen!`,{alarm:true});
 }else if(state.elapsed>=finish){
  state.running=false;state.runAnchor=null;
  notify('🏁 EINDE WEDSTRIJD!',{alarm:true,final:true});
 }
 if(state.elapsed!==before||!state.running){save();render();}
}
setInterval(tickMatch,250);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tickMatch();});
window.addEventListener('pageshow',tickMatch);
window.addEventListener('pagehide',()=>{save();});
render();


// Separate immutable match snapshots; these are never loaded into the live match.
const ARCHIVE_KEY='voetbalwissel-match-archive-v1';
function getArchive(){try{const data=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'[]');return Array.isArray(data)?data:[];}catch(e){return [];}}
function archiveMatch(){
 if(state.running){notify('Pauzeer eerst de wedstrijd om op te slaan');return;}
 const records=getArchive();
 if(records.some(r=>r.match===state.match)){notify('Deze wedstrijd staat al in de historie');return;}
 if(!confirm(`Wedstrijd ${state.match} definitief opslaan in de historie?`))return;
 const snapshot={
  id:Date.now(),match:state.match,date:new Date().toISOString(),
  format:state.format,interval:state.interval,duration:String(state.duration),
  elapsed:state.elapsed,score:{...currentScore()},names:[...state.names],
  schedule:schedule().map(r=>({keeper:r.keeper,field:[...r.field],bench:[...r.bench]})),
  defenders:[...defenders()],keeperMode:state.keeperMode,fixedKeeper:state.fixedKeeper,startingKeeper:state.startingKeeper,manualBench:[...state.manualBench],fieldOrder:[...state.fieldOrder],coords:positions().map(p=>({x:p.x,y:p.y}))
 };
 records.unshift(snapshot);
 try{localStorage.setItem(ARCHIVE_KEY,JSON.stringify(records));}
 catch(e){notify('Opslaan mislukt: onvoldoende opslagruimte');return;}
 $('archiveStatus').textContent='Wedstrijd '+state.match+' opgeslagen in historie.';
 notify('Wedstrijd opgeslagen in historie');
}
function archiveText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderArchive(){
 const records=getArchive();
 $('historyDetail').hidden=true;
 $('historyList').hidden=false;
 $('historyList').innerHTML=records.length?records.map((r,i)=>{
  const dt=new Date(r.date);const date=Number.isNaN(dt.getTime())?'Onbekende datum':dt.toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
  return `<button class="archive-entry secondary" data-archive="${i}"><span>Wedstrijd ${archiveText(r.match)} · ${archiveText(date)}</span><strong>${archiveText(r.score.home)} – ${archiveText(r.score.away)}</strong><small>${archiveText(r.format)} tegen ${archiveText(r.format)} · Bekijken ›</small></button>`;
 }).join(''):'<p class="hint">Er zijn nog geen wedstrijden opgeslagen.</p>';
}
function openArchiveDetail(index){
 const r=getArchive()[index];if(!r)return;
 const n=i=>archiveText(r.names[i]||`Speler ${i+1}`);
 const d=DURATIONS[r.duration]||DURATIONS['40'];
 $('historyList').hidden=true;$('historyDetail').hidden=false;
 $('historyDetail').innerHTML=`<button id="archiveListBack" class="secondary">← Alle wedstrijden</button>
  <h3>Wedstrijd ${archiveText(r.match)} · ${archiveText(new Date(r.date).toLocaleDateString('nl-NL'))}</h3>
  <div class="archive-score">${archiveText(r.score.home)} – ${archiveText(r.score.away)}</div>
  <p>${archiveText(r.format)} tegen ${archiveText(r.format)} · ${archiveText(d.label)} · Wisselen om de ${archiveText(r.interval)} minuten</p>
  <p class="hint">Deze wedstrijd blijft in de historie bewaard. Je kunt een bewerkbare kopie openen, aanpassen, opnieuw opslaan en delen.</p>
  <button id="editArchivedLineup" type="button">✎ Als opstelling bewerken</button>
  <div class="table-wrap"><table><thead><tr><th>Min.</th><th>Keeper</th><th>Wisselbank</th></tr></thead><tbody>${r.schedule.map((s,i)=>`<tr><td>${i*r.interval}–${Math.min(d.total,(i+1)*r.interval)}</td><td>${n(s.keeper)}</td><td>${s.bench.map(n).join(' · ')||'—'}</td></tr>`).join('')}</tbody></table></div>`;
 $('archiveListBack').addEventListener('click',renderArchive);
 $('editArchivedLineup').addEventListener('click',()=>editArchivedLineup(r));
}
function editArchivedLineup(r){
 if(state.running){alert('Pauzeer eerst de wedstrijd.');return;}
 const item={id:'archive-'+r.id,title:`Wedstrijd ${r.match} · bewerkbare kopie`,date:new Date().toISOString(),
  format:Number(r.format),interval:Number(r.interval),duration:String(r.duration),names:[...r.names],
  defenders:Array.isArray(r.defenders)?r.defenders:null,keeperMode:r.keeperMode||'rotate',
  fixedKeeper:r.fixedKeeper??null,startingKeeper:r.startingKeeper??null,
  manualBench:Array.isArray(r.manualBench)?r.manualBench:[],fieldOrder:Array.isArray(r.fieldOrder)?r.fieldOrder:[],
  rows:r.schedule.map(v=>({keeper:v.keeper,field:[...v.field],bench:[...v.bench]})),coords:r.coords||null};
 if(!confirm('Een bewerkbare kopie van deze wedstrijd openen? De oorspronkelijke wedstrijdhistorie blijft ongewijzigd.'))return;
 openSavedLineup(item,true);
}
function showScreen(screen){
 $('mainView').hidden=screen!=='home';
 $('historyView').hidden=screen!=='history';
 $('savedLineupsView').hidden=screen!=='savedLineups';
 if(screen==='savedLineups')renderSavedLineups();
 if(screen==='history')renderArchive();
 $('mainMenu').hidden=true;$('menuToggle').setAttribute('aria-expanded','false');
 window.scrollTo(0,0);
}
$('menuToggle').addEventListener('click',()=>{
 const opening=$('mainMenu').hidden;$('mainMenu').hidden=!opening;
 $('menuToggle').setAttribute('aria-expanded',String(opening));
});
$('menuHome').addEventListener('click',()=>showScreen('home'));
$('menuHistory').addEventListener('click',()=>showScreen('history'));
$('historyBack').addEventListener('click',()=>showScreen('home'));
$('archiveMatch').addEventListener('click',archiveMatch);
$('historyList').addEventListener('click',e=>{
 const b=e.target.closest('[data-archive]');if(b)openArchiveDetail(Number(b.dataset.archive));
});


// V29: independently stored reusable lineup snapshots; no changes to match archive.
const SAVED_LINEUPS_KEY='coaches-saved-lineups-v1';
function readSavedLineups(){
 try{const v=JSON.parse(localStorage.getItem(SAVED_LINEUPS_KEY)||'[]');return Array.isArray(v)?v:[];}
 catch(e){return [];}
}
function writeSavedLineups(list){
 try{localStorage.setItem(SAVED_LINEUPS_KEY,JSON.stringify(list));return true;}
 catch(e){alert('Opslaan mislukt. Controleer de opslagruimte op dit toestel.');return false;}
}
function saveCurrentLineup(){
 if(state.running){alert('Pauzeer eerst de wedstrijd voordat je een opstelling opslaat.');return;}
 const rows=schedule();const active=rows[currentSlot()];
 const suggested=`${state.format} tegen ${state.format} · ${new Date().toLocaleDateString('nl-NL')}`;
 const label=prompt('Naam voor deze opstelling:',suggested);
 if(label===null)return;
 const title=label.trim().slice(0,80)||suggested;
 const snapshot={id:Date.now()+'-'+Math.random().toString(36).slice(2,7),title,date:new Date().toISOString(),
  format:state.format,interval:state.interval,duration:state.duration,names:[...state.names],
  defenders:Array.isArray(state.defenders)?[...state.defenders]:null,
  keeperMode:state.keeperMode,fixedKeeper:state.fixedKeeper,
  startingKeeper:state.startingKeeper,manualBench:[...state.manualBench],fieldOrder:[...state.fieldOrder],
  match:state.match,slot:currentSlot(),
  rows:rows.map(r=>({keeper:r.keeper,field:[...r.field],bench:[...r.bench]})),
  coords:positions().map(p=>({x:p.x,y:p.y}))};
 const list=readSavedLineups();list.unshift(snapshot);
 if(writeSavedLineups(list))notify('Opstelling opgeslagen onder ☰ Menu');
}
function renderSavedLineups(){
 const list=readSavedLineups(),target=$('savedLineupsList');target.replaceChildren();
 if(!list.length){const p=document.createElement('p');p.className='hint';p.textContent='Nog geen opstellingen opgeslagen. Gebruik de knop Opstelling opslaan boven het veld.';target.append(p);return;}
 list.forEach(item=>{
  const wrap=document.createElement('div');wrap.className='saved-lineup-entry';
  const info=document.createElement('div');
  const nameEl=document.createElement('strong');nameEl.textContent=item.title||'Opstelling';
  const details=document.createElement('small');details.textContent=`${new Date(item.date).toLocaleString('nl-NL',{dateStyle:'medium',timeStyle:'short'})} · ${item.format} tegen ${item.format} · ${item.names?.length||'?'} spelers`;
  info.append(nameEl,details);
  const actions=document.createElement('div');actions.className='saved-lineup-actions';
  const open=document.createElement('button');open.textContent='Openen';open.addEventListener('click',()=>openSavedLineup(item));
  const del=document.createElement('button');del.className='secondary';del.textContent='Verwijderen';del.addEventListener('click',()=>{
   if(!confirm(`Opstelling "${item.title}" verwijderen?`))return;
   if(writeSavedLineups(readSavedLineups().filter(v=>v.id!==item.id)))renderSavedLineups();
  });
  const share=document.createElement('button');share.className='secondary';share.textContent='↗ WhatsApp delen';share.addEventListener('click',()=>shareSavedLineup(item));
  actions.append(open,share,del);wrap.append(info,actions);target.append(wrap);
 });
}
function openSavedLineup(item,confirmed=false){
 if(state.running){alert('Pauzeer eerst de wedstrijd voordat je een opstelling opent.');return;}
 if(!Array.isArray(item.names)||!Array.isArray(item.rows)||![6,8,11].includes(item.format)){
  alert('Deze opstelling kan niet worden geopend.');return;
 }
 if(!confirmed&&!confirm(`Opstelling "${item.title}" openen? De huidige niet-opgeslagen opstelling wordt vervangen. Je wedstrijdhistorie blijft bewaard.`))return;
 const backup=JSON.parse(JSON.stringify(state));
 try{
  state.format=item.format;state.interval=item.interval;state.duration=item.duration;
  state.names=[...item.names];state.defenders=Array.isArray(item.defenders)?[...item.defenders]:null;
  state.keeperMode=item.keeperMode||'rotate';state.fixedKeeper=item.fixedKeeper??null;
  state.startingKeeper=item.startingKeeper??null;
  state.manualBench=[...(item.manualBench||[])];state.fieldOrder=[...(item.fieldOrder||[])];
  // Start at the beginning of the loaded lineup; do not overwrite scores or match archive.
  state.elapsed=0;state.running=false;state.halftime=false;
  const rows=item.rows.map(r=>({keeper:r.keeper,field:[...r.field],bench:[...r.bench]}));
  // Reuse the stored schedule for this match under its new key.
  state.history={[scheduleKey()]:rows};
  if(Array.isArray(item.coords)&&item.coords.length===item.format){
   customFormations[String(item.format)]=item.coords.map(p=>({x:p.x,y:p.y}));
   localStorage.setItem(FORMATION_KEY,JSON.stringify(customFormations));
  }
  save();showScreen('home');render();notify('Opstelling geopend');
 }catch(e){state=backup;save();alert('Opstelling openen mislukt. De vorige instellingen zijn hersteld.');}
}
$('saveCurrentLineup').addEventListener('click',saveCurrentLineup);
$('menuSavedLineups').addEventListener('click',()=>showScreen('savedLineups'));
$('savedLineupsBack').addEventListener('click',()=>showScreen('home'));


// V33: share a portable, versioned lineup file (no accounts or server needed).
function safeShareName(title){return String(title||'opstelling').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,55)||'opstelling';}
async function shareSavedLineup(item){
 const payload={type:'coaches-wissel-opstelling',version:1,lineup:item};
 const filename=`coaches-opstelling-${safeShareName(item.title)}.json`;
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const file=new File([blob],filename,{type:'application/json'});
 try{
  if(navigator.share&&navigator.canShare?.({files:[file]})){
   await navigator.share({files:[file],title:`Opstelling: ${item.title}`,text:'Open dit opstellingsbestand in De Coaches Wissel App via Menu → Opgeslagen opstellingen → Gedeelde opstelling openen.'});
   return;
  }
 }catch(e){if(e.name==='AbortError')return;}
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
 alert('Opstelling als bestand opgeslagen. Deel dit JSON-bestand via WhatsApp. De andere coach importeert het via Menu → Opgeslagen opstellingen → Gedeelde opstelling openen.');
}
function validSharedLineup(item){
 return item&&typeof item==='object'&&typeof item.title==='string'&&item.title.length<=200&&
 [6,8,11].includes(item.format)&&Array.isArray(item.names)&&item.names.length>=item.format&&item.names.length<=40&&
 item.names.every(n=>typeof n==='string'&&n.length<=120)&&
 Number.isInteger(item.interval)&&item.interval>=5&&item.interval<=45&&
 ['40','60q','60h','70','80','90',40,70,80,90].includes(item.duration)&&
 Array.isArray(item.rows)&&item.rows.length>0&&item.rows.length<=25&&item.rows.every(r=>r&&
 Number.isInteger(r.keeper)&&r.keeper>=0&&r.keeper<item.names.length&&
 Array.isArray(r.field)&&Array.isArray(r.bench)&&
 [...r.field,...r.bench].every(n=>Number.isInteger(n)&&n>=0&&n<item.names.length))&&
 (!item.coords||(Array.isArray(item.coords)&&item.coords.length===item.format&&item.coords.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y))));
}
$('importSharedLineup').addEventListener('click',()=>$('sharedLineupFile').click());
$('sharedLineupFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(file.size>250000){alert('Bestand is te groot voor een opstelling.');return;}
 try{
  const payload=JSON.parse(await file.text());
  if(payload.type!=='coaches-wissel-opstelling'||payload.version!==1||!validSharedLineup(payload.lineup))throw Error('invalid');
  const item={...payload.lineup,id:Date.now()+'-'+Math.random().toString(36).slice(2,8),title:payload.lineup.title.slice(0,80),date:new Date().toISOString()};
  if(!confirm(`Gedeelde opstelling "${item.title}" toevoegen aan jouw opgeslagen opstellingen?`))return;
  const list=readSavedLineups();list.unshift(item);
  if(writeSavedLineups(list)){renderSavedLineups();notify('Gedeelde opstelling toegevoegd. Tik op Openen om te gebruiken.');}
 }catch(err){alert('Dit bestand is geen geldige gedeelde opstelling van De Coaches Wissel App.');}
});
